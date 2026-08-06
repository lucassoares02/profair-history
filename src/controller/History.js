const { connection } = require("@server");
const logger = require("@logger");

const IGNORE_FORNECEDOR_ID = 158;
const getIgnoreFornecedorFlag = (fornecedor) => (Number(fornecedor) === IGNORE_FORNECEDOR_ID ? 1 : 0);
const queryAsync = (query, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(query, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(results);
    });
  });

const getAvailableEventIds = async () => {
  const results = await queryAsync("SELECT id FROM events ORDER BY id");

  return results
    .map((event) => Number(event.id))
    .filter((eventId) => Number.isInteger(eventId) && eventId > 0);
};

const buildEventValueColumns = async ({ eventColumn, valueExpression }) => {
  const eventIds = await getAvailableEventIds();

  return eventIds
    .map(
      (eventId) => `IFNULL(SUM(
              CASE 
                  WHEN ${eventColumn} = ${eventId} THEN ${valueExpression}
                  ELSE 0
              END
          ), 0) AS valorEvento${eventId}`,
    )
    .join(",\n          ");
};

const History = {
  async find(req, res) {
    logger.info("Get History to Client");

    const { id } = req.params;

    const query = "select * from associado";

    connection.query(query, [id], (error, results, fields) => {
      if (error) {
        logger.error(`Error Select History (history): ${error}`);
        return res.status(500).json({ message: "Error select history" });
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
        logger.error(`Error Select History (history): ${error}`);
        return res.status(500).json({ message: "Error select history" });
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
        logger.error(`Error Select History (history): ${error}`);
        return res.status(500).json({ message: "Error select history" });
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
        logger.error(`Error Select History (history): ${error}`);
        return res.status(500).json({ message: "Error select history" });
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
        logger.error(`Error Select Request (history): ${error}`);
        return res.status(500).json({ message: "Error select request" });
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
        logger.error(`Error Select Details Request (history): ${error}`);
        return res.status(500).json({ message: "Error select details request" });
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
        logger.error(`Error Select Details Request (history): ${error}`);
        return res.status(500).json({ message: "Error select details request" });
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
        logger.error(`Error Select Details Request (history): ${error}`);
        return res.status(500).json({ message: "Error select details request" });
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
    let eventValueColumns = "";

    try {
      eventValueColumns = await buildEventValueColumns({
        eventColumn: "pedido.event",
        valueExpression: "mercadoria.precoMercadoria * pedido.quantMercPedido",
      });
    } catch (error) {
      logger.error(`Error Select Events (history): ${error}`);
      return res.status(500).json({ message: "Error selecting events" });
    }

    const query = `SET sql_mode = ''; SELECT
          a.codAssociadoEvent,
          a.razaoAssociado,
          IFNULL(SUM(pedido.quantMercPedido), 0) AS volumeTotal,
          IFNULL(SUM(mercadoria.precoMercadoria * pedido.quantMercPedido), 0) AS valorTotal${eventValueColumns ? `,
          ${eventValueColumns}` : ""}
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
        logger.error(`Error Select Details Request (history): ${error}`);
        return res.status(500).json({ message: "Error select details request" });
      } else {
        return res.json(results[1]);
      }
    });
    // connection.end();
  },

  async findListProviderbyClient(req, res) {
    logger.info("Get Details Requests by Provider");

    const { associado } = req.params;
    let eventValueColumns = "";

    try {
      eventValueColumns = await buildEventValueColumns({
        eventColumn: "p.event",
        valueExpression: "m.precoMercadoria * p.quantMercPedido",
      });
    } catch (error) {
      logger.error(`Error Select Events (history): ${error}`);
      return res.status(500).json({ message: "Error selecting events" });
    }

    const query = `SET sql_mode = ''; SELECT
        f.codFornEvent,
        f.nomeForn,
        IFNULL(SUM(p.quantMercPedido), 0) AS volumeTotal,
        IFNULL(SUM(m.precoMercadoria * p.quantMercPedido), 0) AS valorTotal${eventValueColumns ? `,
        ${eventValueColumns}` : ""}

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
        logger.error(`Error Select Details Request (history): ${error}`);
        return res.status(500).json({ message: "Error select details request" });
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
  FROM (
      SELECT
          codFornEvent,
          MAX(nomeForn) AS nomeForn,
          event
      FROM fornecedor
      GROUP BY codFornEvent, event
  ) f
  JOIN pedido
      ON pedido.codFornPedido = f.codFornEvent
     AND pedido.event = f.event
  JOIN mercadoria
      ON mercadoria.codMercadoria = pedido.codMercPedido
     AND mercadoria.nego = pedido.codNegoPedido
  GROUP BY
      f.codFornEvent,
      f.nomeForn,
      f.event
  HAVING
      valorTotal != 0
  ORDER BY
      f.event,
      valorTotal DESC;`;

    connection.query(query, [fornecedor], (error, results, fields) => {
      if (error) {
        logger.error(`Error Select Details Request (history): ${error}`);
        return res.status(500).json({ message: "Error select details request" });
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
          logger.error(`Error Update Provider (history): ${error}`);
          return res.status(500).json({ message: "Error updating provider" });
        } else {
          return res.json({ message: "Provider updated successfully" });
        }
      },
    );
    // connection.end();
  },

  // Totais negociados por associado (loja) em cada evento do histórico.
  // Resposta: { events: [{id, descricao}], data: [{ idLoja, nome, cnpj, totais: { [eventId]: valor } }] }
  async reportTotalsAssociados(req, res) {
    logger.info("Get Report Totals by Associado (history)");
    try {
      const events = await queryAsync("SELECT id, descricao FROM events ORDER BY id");
      const eventIds = events
        .map((event) => Number(event.id))
        .filter((eventId) => Number.isInteger(eventId) && eventId > 0);

      const totalColumns = eventIds
        .map(
          (eventId) =>
            `IFNULL(CAST(SUM(CASE WHEN p.event = ${eventId} THEN p.quantMercPedido * m.precoMercadoria ELSE 0 END) AS DOUBLE), 0) AS evento_${eventId}`,
        )
        .join(",\n          ");

      const query = `SELECT
          a.idLoja AS idLoja,
          MAX(a.razaoAssociado) AS nome,
          MAX(a.cnpjAssociado) AS cnpj,
          ${totalColumns}
      FROM pedido p
          JOIN mercadoria m ON m.codMercadoria = p.codMercPedido
                          AND m.nego = p.codNegoPedido
          JOIN associado a ON a.codAssociadoEvent = p.codAssocPedido
                          AND a.event = p.event
      GROUP BY a.idLoja
      ORDER BY a.idLoja`;

      const rows = await queryAsync(query);
      const data = rows.map((row) => ({
        idLoja: row.idLoja,
        nome: row.nome,
        cnpj: row.cnpj,
        totais: eventIds.reduce((acc, eventId) => {
          acc[eventId] = row[`evento_${eventId}`] || 0;
          return acc;
        }, {}),
      }));

      return res.json({
        events: events.map((event) => ({ id: event.id, descricao: event.descricao })),
        data,
      });
    } catch (error) {
      logger.error(`Error report totals associados (history): ${error}`);
      return res.status(500).json({ message: "Error report totals associados" });
    }
  },

  // Totais negociados por fornecedor em cada evento do histórico.
  // Fornecedor identificado pelo cnpjForn (consistente entre eventos).
  async reportTotalsFornecedores(req, res) {
    logger.info("Get Report Totals by Fornecedor (history)");
    try {
      const events = await queryAsync("SELECT id, descricao FROM events ORDER BY id");
      const eventIds = events
        .map((event) => Number(event.id))
        .filter((eventId) => Number.isInteger(eventId) && eventId > 0);

      const totalColumns = eventIds
        .map(
          (eventId) =>
            `IFNULL(CAST(SUM(CASE WHEN p.event = ${eventId} THEN p.quantMercPedido * m.precoMercadoria ELSE 0 END) AS DOUBLE), 0) AS evento_${eventId}`,
        )
        .join(",\n          ");

      const query = `SELECT
          f.cnpjForn AS cnpj,
          MAX(f.nomeForn) AS nome,
          ${totalColumns}
      FROM pedido p
          JOIN mercadoria m ON m.codMercadoria = p.codMercPedido
                          AND m.nego = p.codNegoPedido
          JOIN fornecedor f ON f.codFornEvent = p.codFornPedido
                          AND f.event = p.event
      GROUP BY f.cnpjForn
      ORDER BY f.cnpjForn`;

      const rows = await queryAsync(query);
      const data = rows.map((row) => ({
        cnpj: row.cnpj,
        nome: row.nome,
        totais: eventIds.reduce((acc, eventId) => {
          acc[eventId] = row[`evento_${eventId}`] || 0;
          return acc;
        }, {}),
      }));

      return res.json({
        events: events.map((event) => ({ id: event.id, descricao: event.descricao })),
        data,
      });
    } catch (error) {
      logger.error(`Error report totals fornecedores (history): ${error}`);
      return res.status(500).json({ message: "Error report totals fornecedores" });
    }
  },
};

module.exports = History;
