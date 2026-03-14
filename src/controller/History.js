const { connection } = require("@server");
const logger = require("@logger");

const History = {
  async find(req, res) {
    logger.info("Get History to Client");

    const { id } = req.params;

    const query = "select * from history where id_user = ? order by date desc";

    connection.query(query, [id], (error, results, fields) => {
      if (error) {
        console.log("Error Select History: ", error);
      } else {
        return res.json(results);
      }
    });
    // connection.end();
  },
};

module.exports = History;
