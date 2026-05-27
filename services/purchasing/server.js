const { createApp } = require("./app");

const port = Number(process.env.PORT || 4004);

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`purchasing-service listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start purchasing-service", error);
    process.exit(1);
  });
