const imgs = (() => {
  try {
    const nodeguicon =
      process.env.NODE_ENV === "production"
        ? require("../assets/nodegui.png")
        : null;
  } catch (error) {}
  return;
})();

module.exports = { imgs };
