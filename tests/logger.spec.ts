import { test } from '@japa/runner'
import dgram from 'dgram'
import { deserialize } from 'v8'
import winston from 'winston'
import make from '../'

test.group('PandoLogger', (group) => {
  const socket = dgram.createSocket('udp4')
  group.tap((test) => test.tags(['@PandoLogger']))
  group.setup(async () => {
    socket.bind(1835)
  })
  group.teardown(async () => {
    socket.close()
  })

  test('Able to create a logger instance', ({ assert }) => {
    const logger = make('test')
    assert.instanceOf(logger, winston.Logger)
  })

  test('Able to log a message', async ({ assert }) => {
    let timeout: NodeJS.Timeout | undefined
    const promised = new Promise((resolve, reject) => {
      socket.once('message', (msg) => {
        resolve(msg)
      })
      timeout = setTimeout(() => {
        reject(new Error('Timed Out after 1000 ms'))
      }, 1000)
    })
    const logger = make('test')
    logger.info('Hello World')
    let message: Buffer | undefined
    try {
      message = (await promised) as Buffer
    } catch (error) {
      clearTimeout(timeout)
      assert.fail(error.message)
    }
    clearTimeout(timeout)
    assert.instanceOf(message, Buffer)
    const deserialized = deserialize(message!)
    assert.isObject(deserialized)
    assert.deepEqual(Object.keys(deserialized!), ['channel', 'what'])
    assert.equal(deserialized!.channel, 'test')
    assert.isArray(deserialized!.what)
    assert.equal(deserialized!.what[0], '{"level":"info","message":"Hello World"}')
  })
})
