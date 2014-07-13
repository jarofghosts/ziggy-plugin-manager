var spawn = require('child_process').spawn
  , path = require('path')

var dotpath = require('dotpather')

module.exports = pluginManager

function pluginManager(ziggy) {
  ziggy.on('message', parseMessage)
  ziggy.on('pm', parsePm)

  function parseMessage(user, channel, text) {
    var bits = text.split(/\s+/)
      , command = bits[0]
      , toDo = bits[1]
      , names

    names = bits.slice(2)

    if(command !== '!plugin' || !user.info.authenticated ||
        user.info.level < 3) return

    if(toDo === 'list' || toDo === 'ls') return listPlugins()
    if(toDo === 'install') return installPlugins()
    if(toDo === 'remove') return removePlugins()

    ziggy.say(channel, 'unrecognized command') 

    function listPlugins() {
      var plugins = ziggy.settings.plugins
        , lookup = dotpath('name')

      ziggy.say(
          channel
        , 'installed plugins: ' + plugins
            .map(lookup)
            .map(noZiggy)
            .join(', ')
      )
    }

    function installPlugins() {
      name.split(' ').filter(Boolean).forEach(installPlugin)
    }

    function installPlugin(name) {
      var npm = spawn('npm', ['i', 'ziggy-' + name + '@latest'])

      npm.on('close', finalizeInstall)
    }

    function noZiggy(name) {
      return name.replace(/^ziggy\-/, '')
    }

    function finalizeInstall(code) {
      if(code) return ziggy.say(channel, 'install of ' + name + ' failed.')

      var already_installed = false
        , plugins

      plugins = ziggy.settings.plugins

      plugins = splice(plugins)

      plugins.push({
          name: name
        , setup: getPluginSetup(name)
      })

      ziggy.settings.plugins = plugins

      refreshPlugins()

      ziggy.say(channel, 'plugin ' + name + ' installed.')
    }

    function removePlugins() {
      names.split(' ').filter(Boolean).forEeach(removePlugin)
    }

    function removePlugin(name) {
      ziggy.settings.plugins = splice(ziggy.settings.plugins)

      refreshPlugins()

      ziggy.say(channel, 'plugin ' + name + ' uninstalled.')
    }

    function splice(plugins) {
      return plugins.filter(removeSelected)

      function removeSelected(plugin) {
        return plugin.name !== name
      }
    }

    function refreshPlugins() {
      ziggy.deactivatePlugins()
      ziggy.activatePlugins()
    }

    function getPluginSetup(name) {
      delete require.cache[require.resolve('ziggy-' + name)]

      try {
        return require('ziggy-' + name)
      } catch(e) {
        return noop
      }
    }
  }

  function parsePm(user, text) {
    parseMessage(user, user.nick, text)
  }
}

function noop() {}
