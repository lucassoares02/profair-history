module.exports = {
    app: {
        port: process.env.PORT || 3001,
        portbd: process.env.MYSQL_PORT,
        host: process.env.MYSQL_HOSTNAME,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    }
};
