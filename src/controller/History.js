const { connection } = require("@server");
const logger = require("@logger");

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

  // LISTA DE EVENTOS E VALORES DO ASSOCIADO NO FORNECEDOR
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

  async findValueEventsByFornecedor(req, res) {
    logger.info("Get History to Provider");

    const { fornecedor } = req.params;

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
        p.codFornPedido = ?
    GROUP BY 
        p.event, 
        e.id, 
        e.descricao;`;

    connection.query(query, [fornecedor], (error, results, fields) => {
      if (error) {
        console.log("Error Select History: ", error);
      } else {
        return res.json(results);
      }
    });
    // connection.end();
  },

  // LISTA DE PEDIDOS DO ASSOCIADO NO FORNECEDOR
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

  // DETALHES DO PEDIDOS DO ASSOCIADO NO FORNECEDOR
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
        AND pedido.codfornpedido = ?
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

  // DETALHES DO PEDIDOS DO ASSOCIADO NO FORNECEDOR
  async findListClientByProvider(req, res) {
    logger.info("Get Details Requests by Client");

    const { fornecedor } = req.params;

    const query = `SET sql_mode = ''; SELECT
          a.codAssociadoEvent,
          a.razaoAssociado,
          IFNULL(SUM(pedido.quantMercPedido), 0) as volumeTotal,
          IFNULL(
              SUM(mercadoria.precoMercadoria * pedido.quantMercPedido),
              0
          ) AS valorTotal
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
      WHERE
          pedido.codFornPedido = ${fornecedor}
          AND pedido.event = f.event
      GROUP BY
          a.codAssociadoEvent,
          a.razaoAssociado
      HAVING
          valorTotal != 0
      ORDER BY
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
          AND pedido.codfornpedido = ?
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
};

module.exports = History;
