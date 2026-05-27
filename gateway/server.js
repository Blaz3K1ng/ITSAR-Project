const { createApp } = require("./app");

const port = Number(process.env.PORT || 4000);

createApp().listen(port, () => {
  console.log(`api-gateway listening on ${port}`);
});
