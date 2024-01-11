import dgram from 'dgram'
import { Writable } from 'stream'
import { inspect } from 'util'
import { serialize } from 'v8'
import winston from 'winston'

let socket: dgram.Socket | undefined
let stream: Writable | undefined

export default function make(channel: string, port: number = 1835) {
  if (!socket) {
    socket = dgram.createSocket('udp4')
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
  }
  const logger = winston.createLogger({
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
  return logger
}
