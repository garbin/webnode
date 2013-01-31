module.exports = (req, res, route, error)->
  # 在此之前已经有输入，则仅记录日志
  req.log.error {error:error}, 'Uncaught Exception'
  if @listeners('uncaughtException').length > 2 || res._headerSent
    no
  res.send error
  yes
