module.exports = function (req, res, next) {
  if (req.url === "/sw.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(
      'self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", () => self.registration.unregister());',
    );
    return;
  }
  next();
};
