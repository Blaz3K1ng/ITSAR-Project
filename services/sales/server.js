const { createApp } = require("./app");

const port = Number(process.env.PORT || 4003);

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`sales-service listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start sales-service", error);
    process.exit(1);
  });
