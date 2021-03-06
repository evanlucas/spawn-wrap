var sw = require('../')
var onExit = require('signal-exit')

var cp = require('child_process')
var fixture = require.resolve('./fixtures/script.js')

if (process.argv[2] === 'parent') {
  // hang up once
  process.once('SIGHUP', function onHup () {
    console.log('SIGHUP')
  })
  // handle sigints forever
  process.on('SIGINT', function onInt () {
    console.log('SIGINT')
  })
  onExit(function (code, signal) {
    console.log('EXIT %j', [code, signal])
  })
  var argv = process.argv.slice(3).map(function (arg) {
    if (arg === fixture) {
      return '{{FIXTURE}}'
    }
    return arg
  })
  console.log('WRAP %j', process.execArgv.concat(argv))
  sw.runMain()
  return
}

var t = require('tap')
var unwrap = sw([__filename, 'parent'])

var expect = 'WRAP ["{{FIXTURE}}","xyz"]\n' +
  '[]\n' +
  '["xyz"]\n' +
  'EXIT [0,null]\n'

t.test('spawn execPath', function (t) {
  var child = cp.spawn(process.execPath, [fixture, 'xyz'])

  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, expect)
    t.end()
  })
})

t.test('exec shebang', function (t) {
  var child = cp.exec(fixture + ' xyz')

  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, expect)
    t.end()
  })
})

t.test('SIGHUP', function (t) {
  var child = cp.exec(fixture + ' xyz')

  var out = ''
  child.stdout.on('data', function (c) {
    out += c
    child.kill('SIGHUP')
  })
  child.on('close', function (code, signal) {
    t.equal(code, null)
    t.equal(signal, 'SIGHUP')
    t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
      '[]\n' +
      '["xyz"]\n' +
      'SIGHUP\n' +
      'EXIT [null,"SIGHUP"]\n')
    t.end()
  })
})

t.test('SIGINT', function (t) {
  var child = cp.exec(fixture + ' xyz')

  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.stdout.once('data', function () {
    child.kill('SIGINT')
  })
  child.stderr.on('data', function (t) {
    console.error(t)
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
      '[]\n' +
      '["xyz"]\n' +
      'SIGINT\n' +
      'EXIT [0,null]\n')
    t.end()
  })
})

t.test('--harmony', function (t) {
  var node = process.execPath
  var child = cp.spawn(node, ['--harmony', fixture, 'xyz'])
  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, 'WRAP ["--harmony","{{FIXTURE}}","xyz"]\n' +
      '["--harmony"]\n' +
      '["xyz"]\n' +
      'EXIT [0,null]\n')
    t.end()
  })
})

t.test('unwrap', function (t) {
  unwrap()
  t.end()
})
