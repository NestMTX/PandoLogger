import dgram from 'dgram'
import { Writable } from 'stream'
import { inspect } from 'util'
import { serialize } from 'v8'
import winston from 'winston'

let socket: dgram.Socket | undefined
let stream: Writable | undefined

const loggers = new Set<winston.Logger>()

export default function make(channel: string, port: number = 1835, level: string = 'debug') {
  if (!socket) {
    socket = dgram.createSocket('udp4')
  } else {
  }
  if (!stream) {
    stream = new Writable({
      write(chunk, _encoding, callback) {
        try {
          const objectified = JSON.parse(chunk.toString())
          const { label, message, level } = objectified
          socket!.send(
            serialize({
              channel: label,
              what: [
                JSON.stringify({
                  level,
                  message: [message]
                    .map((i) => {
                      if ('string' !== typeof i) {
                        return inspect(i, false, 25, true)
                      }
                      return i
                    })
                    .join(' '),
                }),
              ],
            }),
            port,
            'localhost',
            (err) => {
              if (err) {
                console.error(err)
              }
            }
          )
        } catch {
          const stringified = chunk.toString()
          console.log(stringified)
        }
        callback()
      },
    })
  } else {
  }
  const logger = winston.createLogger({
    level,
    levels: {
      emerg: 0,
      alert: 1,
      crit: 2,
      error: 3,
      warning: 4,
      notice: 5,
      info: 6,
      debug: 7,
    },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.label({ label: channel }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Stream({
        stream: stream,
      }),
    ],
  })
  logger.once('finish', () => {
    if (loggers.has(logger)) {
      loggers.delete(logger)
    }
    if (loggers.size === 0) {
      if (stream) {
        stream.end()
        stream = undefined
      }
      if (socket) {
        socket.close()
        socket = undefined
      }
    }
  })
  loggers.add(logger)
  process.on('exit', () => {
    if (loggers.size > 0) {
      loggers.forEach((logger) => {
        logger.end()
      })
    }
  })
  return logger
}
