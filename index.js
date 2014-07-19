var spawn = require('child_process').spawn
  , path = require('path')
  , fs = require('fs')

var dotpath = require('dotpather')

var filePath = path.join(process.cwd(), '.plugins.json')
  , offset = null

module.exports = pluginManager

function pluginManager(ziggy) {
  if(offset === null) {
    offset = ziggy.settings.plugins.length

    try {
      var initial = require(filePath)

      for(var i = 0, l = initial.length; i < l; ++i) {
        installPlugin(initial[i])
      }
    } catch(e) {
    }
  }

  ziggy.on('message', parseMessage)
  ziggy.on('pm', parsePm)

  function installPlugin(name, _cb) {
    var npm = spawn('npm', ['i', 'ziggy-' + name + '@latest'])
      , cb = _cb || Function()

    npm.on('close', finalizeInstall)

    function finalizeInstall(code) {
      if(code) return cb(code)

      var plugins = ziggy.settings.plugins

      plugins = splice(name)(plugins)

      plugins.push({
          name: name
        , setup: getPluginSetup(name)
      })

      ziggy.settings.plugins = plugins

      refreshPlugins()

      cb(null, name)
    }
  }

  function parseMessage(user, channel, text) {
    var bits = text.split(/\s+/)
      , command = bits[0]
      , toDo = bits[1]
      , names

    names = (bits.length > 2 && bits.slice(2) || []).filter(Boolean)

    if(command !== '!plugin' || !user.info.authenticated ||
        user.info.level < 3) return

    if(toDo === 'list' || toDo === 'ls') return listPlugins()
    if(toDo === 'install') return affectPlugins(installPlugin, 'install')
    if(toDo === 'remove') return affectPlugins(removePlugin, 'uninstall')

    ziggy.say(channel, 'unrecognized command') 

    function affectPlugins(fn, type) {
      var total = names.length

      for(var i = 0; i < total; ++i) {
        fn(names[i], countdown)
      }

      function countdown(err, name) {
        if(!--total) {
          writePluginsFile(ziggy.settings.plugins.slice(offset).map(toName))
        }

        if(err) return ziggy.say(channel, type + ' of ' + name + ' failed.')

        ziggy.say(channel, 'plugin ' + name + ' ' + type + 'ed.')
      }
    }

    function listPlugins() {
      var plugins = ziggy.settings.plugins.slice(offset)
        , lookup = dotpath('name')

      ziggy.say(
          channel
        , 'installed plugins: ' + plugins
            .map(lookup)
            .map(noZiggy)
            .join(', ')
      )
    }
  }

  function noZiggy(name) {
    return name.replace(/^ziggy\-/, '')
  }

  function removePlugin(name, _cb) {
    var cb = _cb || Function()

    ziggy.settings.plugins = splice(name)(ziggy.settings.plugins)

    refreshPlugins()

    process.nextTick(cb.bind(null, null, name))
  }

  function refreshPlugins() {
    ziggy.deactivatePlugins()
    ziggy.activatePlugins()
  }

  function parsePm(user, text) {
    parseMessage(user, user.nick, text)
  }
}

function writePluginsFile(plugins) {
  fs.writeFile(filePath, JSON.stringify(plugins), function(err) {
    if(err) console.error('error writing plugins file ' + filePath)
  })
}

function toName(plugin) {
  return plugin.name
}

function splice(name) {
  return function spliceName(plugins) {
    return plugins.filter(removeSelected)

    function removeSelected(plugin) {
      return plugin.name !== name
    }
  }
}

function getPluginSetup(name) {
  delete require.cache[require.resolve('ziggy-' + name)]

  try {
    return require('ziggy-' + name)
  } catch(e) {
    return Function()
  }
}
