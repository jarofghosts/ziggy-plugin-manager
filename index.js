var spawn = require('child_process').spawn
  , dotpath = require('dotpather')

module.exports = plugin_manager

function plugin_manager(ziggy) {
  ziggy.on('message', parse_message)
  ziggy.on('pm', parse_pm)

  function parse_message(user, channel, text) {
    var bits = text.split(/\s+/)
      , command = bits[0]
      , to_do = bits[1]
      , name = bits[2]

    if (command !== '!plugin' || user.userLevel < 3) return

    if (to_do === 'list' || to_do === 'ls') return list_plugins()
    if (to_do === 'install') return install_plugin()
    if (to_do === 'remove') return remove_plugin()

    ziggy.say(channel, 'unrecognized command') 

    function list_plugins() {
      var plugins = ziggy.settings.plugins
        , lookup = dotpath('name')

      ziggy.say(
          channel
        , 'installed plugins: ' + plugins.map(lookup).join(', ')
      )
    }

    function install_plugin() {
      var npm = spawn('npm', ['i', 'ziggy-' + name + '@latest', '-g'])

      npm.on('close', finalize_install)
    }

    function finalize_install(code) {
      if (code) return ziggy.say(channel, 'install of ' + name + ' failed.')

      var already_installed = false

      ziggy.settings.plugins.forEach(function(plugin) {
        if (plugin.name === name) already_installed = true
      })

      if (!already_installed) {
        ziggy.settings.plugins.push({
            name: name
          , setup: get_plugin_setup(name)
        })
      }

      refresh_plugins()

      ziggy.say(channel, 'plugin ' + name + ' installed.')
    }

    function remove_plugin() {
      var plugins = ziggy.settings.plugins

      for (var i = 0, l = plugins.length; i < l; ++i) {
        if (plugins[i].name === name) plugins.splice(i, 1)
      }

      refresh_plugins()

      ziggy.say(channel, 'plugin ' + name + ' uninstalled.')
    }

    function refresh_plugins() {
      ziggy.deactivatePlugins()
      ziggy.activatePlugins()
    }

    function get_plugin_setup(name) {
      try {
        return require('ziggy-' + name)
      } catch(e) {
        return noop
      }
    }
  }

  function parse_pm(user, text) {
    parse_message(user, user.nick, text)
  }
}

function noop() {}
