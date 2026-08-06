require("dotenv").config();
const mysql2 = require("mysql2");

// ATENÇÃO: antes aqui existia um mysql2.createConnection() (conexão única
// persistente). O banco de histórico é remoto (147.93.12.83:3307) e a conexão
// única é derrubada por ociosidade (wait_timeout / firewall) ou por reinício do
// servidor durante importações de dados. Uma vez morta, a conexão única entra em
// estado fatal e mysql2 passa a ENFILEIRAR as queries num socket morto: o callback
// nunca dispara, então as requisições "travam" sem erro nenhum no log (aparece só o
// logger.info do endpoint e depois silêncio). Um POOL resolve: entrega uma conexão
// saudável por query e descarta as mortas automaticamente. Todos os usos são
// pool.query(sql, params, cb), com a mesma assinatura de connection.query, então
// nenhum controller precisa mudar.
var connection = mysql2.createPool({
  connectionLimit: 10,
  port: process.env.MYSQL_PORT,
  host: process.env.MYSQL_HOSTNAME,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: "utf8mb4",
  // ssl: {
  //   rejectUnauthorized: false,
  // },
  insecureAuth: true,
  multipleStatements: true,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Valida a conectividade no boot (o pool cria conexões sob demanda).
connection.getConnection((err, conn) => {
  if (err) {
    console.error("Erro ao conectar ao banco de histórico:", err);
    return;
  }
  console.log("Banco de histórico conectado.");
  conn.release();
});

module.exports = {
  connection,
};
