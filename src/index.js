require('dotenv').config();
const { getPrefix, token, mongoURL, color, lavalink_url, lavalink_auth } = require('./config.js');
const fs = require('fs');
const ms = require('pretty-ms').default;
const config = require('./config.js');
const express = require('express');
const mongoose = require('mongoose'); // Added mongoose
const { ActivityType, Collection, GatewayIntentBits, Client, EmbedBuilder, Partials } = require('discord.js');

const client = new Client({
  intents: Object.keys(GatewayIntentBits).map(intent => intent),
  partials: Object.keys(Partials).map(partial => partial),
  allowedMentions: { repliedUser: false, parse: ['users'] }
});

module.exports = client;

client.commands = new Collection();
client.slashCommands = new Collection();
client.aliases = new Collection();
client.messageTimestamps = new Map();
client.snipes = new Map();
client.cooldowns = new Map();

// Load Commands/Slash/Events/Tables
const commandFolders = fs.readdirSync('./src/commands');
for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`);
    command.category = folder;
    client.commands.set(command.name, command);
    if(command.aliases) {
      for (const aliase of command.aliases) {
        client.aliases.set(aliase, command.name);
      }
    }
  }
}

const slashCommandFolders = fs.readdirSync('./src/slashCommands');
for (const folder of slashCommandFolders) {
  const slashCommandFiles = fs.readdirSync(`./src/slashCommands/${folder}`).filter(file => file.endsWith('.js'));
  for (const file of slashCommandFiles) {
    const slashCommand = require(`./slashCommands/${folder}/${file}`);
    slashCommand.category = folder;
    if (slashCommand.data) {
      client.slashCommands.set(slashCommand.data.name, slashCommand);
    }
  }
}

const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  require(`./events/${file}`);
}

const tableFiles = fs.readdirSync('./src/tables').filter(file => file.endsWith('.js'));
for (const file of tableFiles) {
  client.on("ready", require(`./tables/${file}`));
}

const process = require('node:process');
process.on('unhandledRejection', async (reason, promise) => {
    console.log('Unsupported rejection at:', promise, 'Reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.log('Uncatchable exception:', err);
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
    console.log('Monitor uncaught exceptions:', err, origin);
});

// Music Configuration
const { Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');

const Nodes = [{
  name: 'RaditicMusic',
  url: config.lavalink_url,
  auth: config.lavalink_auth,
  secure: false
}];

client.manager = new Kazagumo({
  defaultSearchEngine: 'youtube', // Maintained as YouTube for public deployment
  plugins: [new Plugins.PlayerMoved(client)],
  send: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  },
}, new Connectors.DiscordJS(client), Nodes);

// BULLETPROOF VOICE TUNNEL (Stops raw loop packet crashes)
client.on('raw', (packet) => {
    if (client.manager?.shoukaku?.nodes) {
        client.manager.shoukaku.nodes.forEach(node => {
            if (node.state === 1) { 
                node.emit('raw', packet);
            }
        });
    }
});

client.manager.shoukaku.on('ready', (name) => console.log(`Lavalink ${name}: Ready!`));
client.manager.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught,`, error));
client.manager.shoukaku.on('close', (name, code, reason) => console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
client.manager.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
client.manager.shoukaku.on('disconnect', (name, count) => {
    const players = [...client.manager.shoukaku.players.values()].filter(p => p.node.name === name);
    players.map(player => {
        client.manager.destroyPlayer(player.guildId);
        player.destroy();
    });
    console.warn(`Lavalink ${name}: Disconnected`);
});

client.manager.on("playerStart", (player, track) => {
  const duration = ms(track.length, { colonNotation: true });
  const currentVolume = player.volume || 40;

  const embed = new EmbedBuilder()
    .setColor('#ffcc00') 
    .setTitle('🎵 Now Playing')
    .setDescription(`**[${track.title}](${track.uri})**`)
    .addFields(
      { name: 'Duration', value: `\`${duration}\``, inline: true },
      { name: 'Volume', value: `\`${currentVolume}%\``, inline: true },
      { name: 'Author', value: `${track.author}`, inline: true },
      { name: 'Requested By', value: `${track.requester}`, inline: true }
    )
    .setThumbnail(track.thumbnail) 
    .setFooter({ text: `Requested by ${track.requester.tag}`, iconURL: track.requester.displayAvatarURL() })
    .setTimestamp();

  client.channels.cache.get(player.textId)?.send({ embeds: [embed] })
    .then(x => player.data.set("message", x));
});

client.manager.on("playerEnd", (player) => {
  player.data.get("message")?.edit({content: `Finished playing`});
});

client.manager.on("playerEmpty", player => {
  client.channels.cache.get(player.textId)?.send({content: `Destroyed player due to inactivity.`})
      .then(x => player.data.set("message", x));
  player.destroy();
});

const Topgg = require('@top-gg/sdk'); 
const app = express();

const webhook = new Topgg.Webhook(process.env.topggAPI); 

app.post('/dblwebhook', webhook.listener(async (vote) => {
  const user = await client.users.fetch(vote.user);
  const channel = client.channels.cache.get('1288152244042334208'); 

  if (channel) {
    channel.send(`<@${vote.user}> has voted for me!`);
  }
}));

app.listen(3000, () => {
  console.log('Express server listening on port 3000');
});

app.get('/', (req, res) => {
  res.send('Online Yo Boy !');
});

client.login(token);
