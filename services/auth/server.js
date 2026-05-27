const { createApp } = require("./app");

const port = Number(process.env.PORT || 4001);

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`auth-service listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start auth-service", error);
    process.exit(1);
  });
