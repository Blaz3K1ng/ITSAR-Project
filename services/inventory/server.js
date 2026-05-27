const { createApp } = require("./app");

const port = Number(process.env.PORT || 4002);

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`inventory-service listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start inventory-service", error);
    process.exit(1);
  });
