const { connection } = require("@server");
const logger = require("@logger");

const IGNORE_FORNECEDOR_ID = 158;
const getIgnoreFornecedorFlag = (fornecedor) => (Number(fornecedor) === IGNORE_FORNECEDOR_ID ? 1 : 0);

const History = {
  async find(req, res) {
    logger.info("Get History to Client");

    const { id } = req.params;

    const query = "select * from associado";

    connection.query(query, [id], (error, results, fields) => {
      if (error) {
        console.log("Error Select History: ", error);
      } else {
        return res.json(results);
      }
    });
    // connection.end();
  },

  async findValueEventsByAssociadoFornecedor(req, res) {
    logger.info("Get History to Client");

    const { associado, fornecedor } = req.params;

    const query = `SELECT
        IFNULL(CAST(SUM(p.quantMercPedido * m.precoMercadoria) AS DOUBLE), 0) AS total,
        e.descricao,
        e.id
    FROM pedido p
        JOIN mercadoria m ON p.codMercPedido = m.codMercadoria 
                        AND m.nego = p.codNegoPedido
        JOIN associado a ON a.codAssociadoEvent = p.codAssocPedido 
                        AND a.event = p.event
        JOIN fornecedor f ON p.codFornPedido = f.codFornEvent 
                        AND f.event = p.event
        JOIN events e ON e.id = p.event
    WHERE 
        p.codFornPedido = ?
        AND p.codAssocPedido = ?
    GROUP BY 
        p.event, 
        e.id, 
        e.descricao;`;

    connection.query(query, [fornecedor, associado], (error, results, fields) => {
      if (error) {
        console.log("Error Select History: ", error);
      } else {
        return res.json(results);
      }
    });
    // connection.end();
  },

  async findValueEventsByFornecedorAssociado(req, res) {
    logger.info("Get History to Client");

    const { associado } = req.params;

    const query = `SELECT
        IFNULL(CAST(SUM(p.quantMercPedido * m.precoMercadoria) AS DOUBLE), 0) AS total,
        e.descricao,
        e.id
    FROM pedido p
        JOIN mercadoria m ON m.codMercadoria = p.codMercPedido
                        AND m.nego = p.codNegoPedido
        JOIN events e ON e.id = p.event
    WHERE 
        p.codAssocPedido = ?
    GROUP BY 
        e.id,
        e.descricao;`;

    connection.query(query, [associado], (error, results, fields) => {
      if (error) {
        console.log("Error Select History: ", error);
      } else {
        return res.json(results);
      }
    });
    // connection.end();
  },

  async findValueEventsByFornecedor(req, res) {
    logger.info("Get History to Provider");

    const { fornecedor } = req.params;
    // check ignore fornecedor flag
    const ignoreFlag = getIgnoreFornecedorFlag(fornecedor);

    const query = `SELECT
        IFNULL(CAST(SUM(p.quantMercPedido * m.precoMercadoria) AS DOUBLE), 0) AS total,
        e.descricao,
        e.id
    FROM pedido p
        JOIN mercadoria m ON p.codMercPedido = m.codMercadoria 
                        AND m.nego = p.codNegoPedido
        JOIN fornecedor f ON p.codFornPedido = f.codFornEvent 
                        AND f.event = p.event
        JOIN events e ON e.id = p.event
    WHERE 
        (? = 1 OR p.codFornPedido = ?)
    GROUP BY 
        p.event, 
        e.id, 
        e.descricao;`;

    connection.query(query, [ignoreFlag, fornecedor], (error, results, fields) => {
      if (error) {
        console.log("Error Select History: ", error);
      } else {
        return res.json(results);
      }
    });
    // connection.end();
  },

  async findRequestsByEventsByAssociadoFornecedor(req, res) {
    logger.info("Get Requests by Client");

    const { associado, fornecedor, evento } = req.params;

    const query = `SET sql_mode = ''; select pedido.codPedido , 
    associado.cnpjAssociado , 
    associado.codAssociado  as codConsultRelaciona,
    consultor.nomeConsult, 
    associado.razaoAssociado, 
    fornecedor.nomeForn,
    fornecedor.codForn,
    negociacao.codNegociacao,
    negociacao.prazo,
    events.descricao as 'event',
    negociacao.descNegociacao,
    sum(pedido.quantMercPedido * mercadoria.precoMercadoria) as 'valor', 
    TIME_FORMAT(SUBTIME(pedido.dataPedido, '03:00:00'),'%H:%i') as 'horas' 
    from pedido
    join consultor on consultor.codConsultEvent = pedido.codComprPedido
    join fornecedor on fornecedor.codForn = pedido.codFornPedido
    join negociacao on negociacao.codNegociacao = pedido.codNegoPedido
    join associado on pedido.codAssocPedido = associado.codAssociado 
    join mercadoria on pedido.codMercPedido = mercadoria.codMercadoria 
    join events on events.id = pedido.event
    where pedido.codAssocPedido = ? 
    and pedido.codFornPedido = ?
    and events.id = ?
    and consultor.event = events.id
    group by pedido.codNegoPedido
    order by horas 
    desc;`;

    connection.query(query, [associado, fornecedor, evento], (error, results, fields) => {
      if (error) {
        console.log("Error Select Request: ", error);
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async findDetailsRequestsByEventsByAssociadoFornecedor(req, res) {
    logger.info("Get Details Requests by Client");

    const { associado, fornecedor, negociacao } = req.params;

    const query = `SET sql_mode = ''; SELECT
    mercadoria.codMercadoria,
    mercadoria.nomeMercadoria,
    mercadoria.embMercadoria,
    mercadoria.fatorMerc,
    mercadoria.complemento,
    mercadoria.marca,
    IFNULL(SUM(pedido.quantMercPedido), 0) as 'quantMercadoria',
    mercadoria.precoMercadoria as precoMercadoria,
    mercadoria.precoUnit,
    IFNULL(
        SUM(
            mercadoria.precoMercadoria * pedido.quantMercPedido
        ),
        0
    ) as 'valorTotal'
    FROM
        mercadoria
        JOIN pedido ON pedido.codMercPedido = mercadoria.codMercadoria
    WHERE
        pedido.codAssocPedido = ?
        AND pedido.codFornPedido = ?
        AND pedido.codNegoPedido = ?
    GROUP BY
        mercadoria.codMercadoria
    HAVING
        valorTotal != 0
    ORDER BY
        quantMercPedido;`;

    connection.query(query, [associado, fornecedor, negociacao], (error, results, fields) => {
      if (error) {
        console.log("Error Select Details Request: ", error);
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async findDetailsClientByProvider(req, res) {
    logger.info("Get Details Requests by Client");

    const { fornecedor, associado } = req.params;

    const query = `SET sql_mode = ''; SELECT 
    a.codAssociadoEvent, 
    n.codNegociacao,
    n.descNegociacao,
    comprador.nomeConsult AS nomeComprador,
    vendedor.nomeConsult AS nomeVendedor,
    p.dataPedido,
    IFNULL(SUM(p.quantMercPedido), 0) AS volumeTotal,
    IFNULL(SUM(p.quantMercPedido * m.precoMercadoria), 0) AS valorTotal, 
    e.id AS idEvento,
    e.descricao AS descricaoEvento
FROM (
    SELECT codAssociadoEvent, razaoAssociado
    FROM associado
    GROUP BY codAssociadoEvent
) a
JOIN pedido p ON p.codAssocPedido = a.codAssociadoEvent 
JOIN fornecedor f ON f.codFornEvent = p.codFornPedido
                 AND f.event = p.event
JOIN mercadoria m ON m.codMercadoria = p.codMercPedido
                 AND m.nego = p.codNegoPedido
JOIN negociacao n ON n.codNegociacao = p.codNegoPedido
JOIN events e ON e.id = p.event
LEFT JOIN consultor comprador ON comprador.codConsultEvent = p.codComprPedido
                              AND comprador.event = p.event
LEFT JOIN consultor vendedor ON vendedor.codConsultEvent = p.codConsultPedido
                             AND vendedor.event = p.event
WHERE 
    p.codFornPedido = ?
    AND p.codAssocPedido = ?
    AND e.id = 1
GROUP BY 
    a.codAssociadoEvent, 
    a.razaoAssociado,
    n.codNegociacao,
    n.descNegociacao,
    comprador.nomeConsult,
    vendedor.nomeConsult,
    p.dataPedido,
    e.id, 
    e.descricao
HAVING 
    valorTotal != 0
ORDER BY 
    e.id, 
    valorTotal DESC;`;

    connection.query(query, [fornecedor, associado], (error, results, fields) => {
      if (error) {
        console.log("Error Select Details Request: ", error);
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async findDetailsNegotiationClientByProvider(req, res) {
    logger.info("Get Details Requests by Negotiation");

    const { fornecedor, associado, negociacao } = req.params;

    const query = `SET sql_mode = ''; SELECT 
      mercadoria.codMercadoria,
      mercadoria.nomeMercadoria,
      mercadoria.embMercadoria,
      mercadoria.fatorMerc,
      mercadoria.complemento,
      mercadoria.marca, 
      IFNULL(SUM(pedido.quantMercPedido), 0) as 'quantMercadoria', 
      mercadoria.precoMercadoria as precoMercadoria,
      mercadoria.precoUnit,
      IFNULL(SUM(mercadoria.precoMercadoria * pedido.quantMercPedido), 0) as 'valorTotal' 
      FROM 
          mercadoria 
      JOIN 
          pedido ON pedido.codMercPedido = mercadoria.codMercadoria 
      WHERE 
          pedido.codAssocPedido = ?
          AND pedido.codFornPedido = ?
          AND pedido.codNegoPedido = ?
      GROUP BY 
          mercadoria.codMercadoria
      HAVING 
          valorTotal != 0
      ORDER BY 
          quantMercPedido;`;

    connection.query(query, [associado, fornecedor, negociacao], (error, results, fields) => {
      if (error) {
        console.log("Error Select Details Request: ", error);
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async findListClientByProvider(req, res) {
    logger.info("Get Details Requests by Client");

    const { fornecedor } = req.params;
    const ignoreFornecedor = getIgnoreFornecedorFlag(fornecedor);

    const query = `SET sql_mode = ''; SELECT
          a.codAssociadoEvent,
          a.razaoAssociado,
          IFNULL(SUM(pedido.quantMercPedido), 0) AS volumeTotal,
          IFNULL(SUM(mercadoria.precoMercadoria * pedido.quantMercPedido), 0) AS valorTotal,
          IFNULL(SUM(
              CASE 
                  WHEN pedido.event = 1 THEN mercadoria.precoMercadoria * pedido.quantMercPedido
                  ELSE 0
              END
          ), 0) AS valorEvento1,
          IFNULL(SUM(
              CASE 
                  WHEN pedido.event = 2 THEN mercadoria.precoMercadoria * pedido.quantMercPedido
                  ELSE 0
              END
          ), 0) AS valorEvento2
      FROM
          (
              SELECT codAssociadoEvent, razaoAssociado
              FROM associado
              GROUP BY codAssociadoEvent
          ) a
          JOIN pedido ON pedido.codAssocPedido = a.codAssociadoEvent
          JOIN mercadoria ON mercadoria.codMercadoria = pedido.codMercPedido
                        AND mercadoria.nego = pedido.codNegoPedido
          JOIN fornecedor f ON f.codFornEvent = pedido.codFornPedido
                          AND f.event = pedido.event
      WHERE
          (? = 1 OR pedido.codFornPedido = ?)
      GROUP BY
          a.codAssociadoEvent,
          a.razaoAssociado
      HAVING
          valorTotal != 0
      ORDER BY
          valorTotal DESC;`;

    connection.query(query, [ignoreFornecedor, fornecedor], (error, results, fields) => {
      if (error) {
        console.log("Error Select Details Request: ", error);
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async findListProviderbyClient(req, res) {
    logger.info("Get Details Requests by Provider");

    const { associado } = req.params;

    const query = `SET sql_mode = ''; SELECT
        f.codFornEvent,
        f.nomeForn,
        IFNULL(SUM(p.quantMercPedido), 0) AS volumeTotal,
        IFNULL(SUM(m.precoMercadoria * p.quantMercPedido), 0) AS valorTotal,
        IFNULL(SUM(
            CASE 
                WHEN p.event = 1 THEN m.precoMercadoria * p.quantMercPedido
                ELSE 0
            END
        ), 0) AS valorEvento1,

        IFNULL(SUM(
            CASE 
                WHEN p.event = 2 THEN m.precoMercadoria * p.quantMercPedido
                ELSE 0
            END
        ), 0) AS valorEvento2

    FROM fornecedor f
    JOIN pedido p 
        ON p.codFornPedido = f.codFornEvent
        AND p.event = f.event

    JOIN mercadoria m 
        ON m.codMercadoria = p.codMercPedido
        AND m.nego = p.codNegoPedido
    WHERE p.codAssocPedido = ?

    GROUP BY
        f.codFornEvent,
        f.nomeForn

    HAVING valorTotal != 0

    ORDER BY
        valorTotal DESC;`;

    connection.query(query, [associado], (error, results, fields) => {
      if (error) {
        console.log("Error Select Details Request: ", error);
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async findListProvider(req, res) {
    logger.info("Get Details Requests by Provider");

    const { fornecedor } = req.params;

    const query = `SET sql_mode = ''; SELECT
        f.codFornEvent,
        f.nomeForn,
        f.event,
        IFNULL(SUM(pedido.quantMercPedido), 0) AS volumeTotal,
        IFNULL(
            SUM(mercadoria.precoMercadoria * pedido.quantMercPedido),
            0
        ) AS valorTotal
    FROM
        (
            SELECT codFornEvent, nomeForn, event
            FROM fornecedor
            GROUP BY codFornEvent, event
        ) f
        JOIN pedido ON pedido.codFornPedido = f.codFornEvent
                  AND pedido.event = f.event
        JOIN mercadoria ON mercadoria.codMercadoria = pedido.codMercPedido
                      AND mercadoria.nego = pedido.codNegoPedido
    GROUP BY
        f.codFornEvent,
        f.nomeForn
    HAVING
        valorTotal != 0
    ORDER BY
        f.event,
        valorTotal DESC;`;

    connection.query(query, [fornecedor], (error, results, fields) => {
      if (error) {
        console.log("Error Select Details Request: ", error);
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async updateProvider(req, res) {
    logger.info("Update Provider");

    const { oldProvider, newProvider } = req.body;

    const query = `START TRANSACTION;

      UPDATE fornecedor 
      SET codFornEvent = ? 
      WHERE codFornEvent = ?;

      UPDATE negociacao 
      SET codFornNegociacao = ? 
      WHERE codFornNegociacao = ?;

      UPDATE pedido 
      SET codFornPedido = ? 
      WHERE codFornPedido = ?;

      UPDATE mercadoria 
      SET codFornMerc = ? 
      WHERE codFornMerc = ?;
      
      UPDATE consultor 
      SET codFornConsult = ? 
      WHERE codFornConsult = ?;

      COMMIT;`;

    connection.query(
      query,
      [newProvider, oldProvider, newProvider, oldProvider, newProvider, oldProvider, newProvider, oldProvider, newProvider, oldProvider],
      (error, results, fields) => {
        if (error) {
          console.log("Error Update Provider: ", error);
          return res.status(500).json({ message: "Error updating provider" });
        } else {
          return res.json({ message: "Provider updated successfully" });
        }
      },
    );
    // connection.end();
  },
};

module.exports = History;
