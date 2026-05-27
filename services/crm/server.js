const { createApp } = require("./app");

const port = Number(process.env.PORT || 4005);

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`crm-service listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start crm-service", error);
    process.exit(1);
  });
