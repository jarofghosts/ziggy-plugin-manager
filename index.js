var spawn = require('child_process').spawn
  , dotpath = require('dotpather')
  , path = require('path')

module.exports = plugin_manager

function plugin_manager(ziggy) {
  ziggy.on('message', parse_message)
  ziggy.on('pm', parse_pm)

  function parse_message(user, channel, text) {
    var bits = text.split(/\s+/)
      , command = bits[0]
      , to_do = bits[1]
      , name = bits[2]

    if(command !== '!plugin' || !user.info.authenticated ||
        user.info.level < 3) return

    if(to_do === 'list' || to_do === 'ls') return list_plugins()
    if(to_do === 'install') return install_plugin()
    if(to_do === 'remove') return remove_plugin()

    ziggy.say(channel, 'unrecognized command') 

    function list_plugins() {
      var plugins = ziggy.settings.plugins
        , lookup = dotpath('name')

      ziggy.say(
          channel
        , 'installed plugins: ' + plugins
            .map(lookup)
            .map(no_ziggy)
            .join(', ')
      )
    }

    function install_plugin() {
      var npm = spawn('npm', ['i', 'ziggy-' + name + '@latest'])

      npm.on('close', finalize_install)
    }

    function no_ziggy(name) {
      return name.replace(/^ziggy\-/, '')
    }

    function finalize_install(code) {
      if(code) return ziggy.say(channel, 'install of ' + name + ' failed.')

      var already_installed = false
        , plugins

      plugins = ziggy.settings.plugins

      plugins = splice(plugins)

      plugins.push({
          name: name
        , setup: get_plugin_setup(name)
      })

      ziggy.settings.plugins = plugins

      refresh_plugins()

      ziggy.say(channel, 'plugin ' + name + ' installed.')
    }

    function remove_plugin() {
      ziggy.settings.plugins = splice(ziggy.settings.plugins)

      refresh_plugins()

      ziggy.say(channel, 'plugin ' + name + ' uninstalled.')
    }

    function splice(plugins) {
      return plugins.filter(remove_selected)

      function remove_selected(plugin) {
        return plugin.name !== name
      }
    }

    function refresh_plugins() {
      ziggy.deactivatePlugins()
      ziggy.activatePlugins()
    }

    function get_plugin_setup(name) {
      try {
        return require('./node_modules/ziggy-' + name)
      } catch(e) {
        try {
          return require('ziggy-' + name)
        } catch(e) {
          return noop
        }
      }
    }
  }

  function parse_pm(user, text) {
    parse_message(user, user.nick, text)
  }
}

function noop() {}
