// hardcode NODE_ENV to "production" so behavior always matches production behavior
process.env.NODE_ENV = "production";

const { app } = require("./app");

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
});
