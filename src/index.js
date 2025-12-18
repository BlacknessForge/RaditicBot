const { getPrefix, token, mongoURL, color } = require('./config.js');
const fs = require('fs');
const ms = require('pretty-ms').default;
const config = require('./config.js');
require('dotenv').config();
const express = require('express');
const { ActivityType, Collection, GatewayIntentBits, Client, Collector, VoiceChannel, EmbedBuilder, Partials } = require('discord.js');

const Discord = require('discord.js');
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
client.messageTimestamps = new Map();
client.cooldowns = new Map();

        const commandFolders = fs.readdirSync('./src/commands');
        for (const folder of commandFolders) {
          const commandFiles = fs.readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
          for (const file of commandFiles) {
            const command = require(`./commands/${folder}/${file}`);
    command.category = folder;
    client.commands.set(command.name, command);
    if(!command.aliases) continue;
    for (const aliase of command.aliases) {
      client.aliases.set(aliase, command.name)
    }

  }
};

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

module.exports = client;
// Load event handler files
const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  require(`./events/${file}`);
};

// Load table files
const tableFiles = fs.readdirSync('./src/tables').filter(file => file.endsWith('.js'));

for (const file of tableFiles) {
 client.on("ready", require(`./tables/${file}`));
}

// Giveaway System index.js

const GiveawaysManager = require('./giveaways');
client.giveawayManager = new GiveawaysManager(client, {

    default: {

        botsCanWin: false,

        embedColor: color.default,

        embedColorEnd: color.default,

        reaction: `ðŸŽ‰`,

    },

}); 

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

// Music
const { Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');

const Nodes = [{
  name: 'RaditicMusic',
  url: config.lavalink_url,
  auth: config.lavalink_auth,
  secure: false
}];

client.manager = new Kazagumo({
  defaultSearchEngine: 'youtube',
  plugins: [new Plugins.PlayerMoved(client)],
  send: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  },
}, new Connectors.DiscordJS(client), Nodes);

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
  // Format song duration in mm:ss format
  const duration = ms(track.length, { colonNotation: true });
  const loopMode = player.data.get('loop') || 'None'; // Get current loop mode
  // Fetch current player volume (default if not set is 40)
  const currentVolume = player.volume || 40;

  // Create embed
  const embed = new EmbedBuilder()
    .setColor('#ffcc00') // You can change this to whatever color you like
    .setTitle('ðŸŽ¶ Now Playing')
    .setDescription(`**[${track.title}](${track.uri})**`)
    .addFields(
      { name: 'Duration', value: `\`${duration}\``, inline: true },
      { name: 'Volume', value: `\`${currentVolume}%\``, inline: true },
      { name: 'Author', value: `${track.author}`, inline: true },
      { name: 'Requested By', value: `${track.requester}`, inline: true }
    )
    .setThumbnail(track.thumbnail) // Set track thumbnail (if available)
    .setFooter({ text: `Requested by ${track.requester.tag}`, iconURL: track.requester.displayAvatarURL() })
    .setTimestamp();

  // Send the embed message
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

const Topgg = require('@top-gg/sdk'); // Ensure you're using topgg SDK
const app = express();

// Initialize the webhook with your top.gg API token
const webhook = new Topgg.Webhook(process.env.topggAPI); // Replace with actual environment variable or token

app.post('/dblwebhook', webhook.listener(async (vote) => {
  const user = await client.users.fetch(vote.user);
  const channel = client.channels.cache.get('1288152244042334208'); // Your channel ID

  // Sends a message in the channel when a vote is received
  if (channel) {
    channel.send(`<@${vote.user}> has voted for me!`);
  }
}));

// Express listener on the port (ensure this matches your server setup)
app.listen(3000, () => {
  console.log('Express server listening on port 3000');
});

app.get('/', (req, res) => {
  res.send('Online Yo Boy !');
});

client.login(token);