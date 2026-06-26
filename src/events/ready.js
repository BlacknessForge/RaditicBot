const { ActivityType } = require('discord.js');
const colors = require('colors');
const mongoose = require('mongoose');
const { mongoURL, topggAPI, color } = require('../config.js');
const { AutoPoster } = require('topgg-autoposter');
const GiveawaysManager = require('../giveaways'); // Ensure this path is correct
const client = require(process.cwd() + '/src/index.js');

client.on("ready", async (client) => {
  // 1. Database Connection & Giveaway Manager
  if (!mongoURL) {
    console.log(colors.magenta('Mongo Database • Disconnected'));
    console.log(colors.magenta('0===========================0'));
  } else {
    await mongoose.connect(mongoURL);
    console.log(colors.magenta('Mongo Database • Connected'));
    console.log(colors.magenta('0===========================0'));

    client.giveawayManager = new GiveawaysManager(client, {
      default: {
        botsCanWin: false,
        embedColor: color.default,
        embedColorEnd: color.default,
        reaction: `🎉`,
      },
    });
  }

  // 2. Set Activity & Register Slash Commands
  client.user.setActivity({
    name: 'r.help',
    type: ActivityType.Watching,
  });
  
  await client.application.commands.set(client.slashCommands.map(command => command.data));

  // 3. Status Logs
  if (!client.slashCommands) {
    console.log(colors.blue('Slash Commands • Not Registered'));
  } else {
    console.log(colors.blue('Slash Commands • Registered'));
  }
  console.log(colors.blue('0===========================0'));

  if (client.user) {
    console.log(colors.red(`${client.user.tag} • Online`));
  } else {
    console.log(colors.red(`Client not found`));
  }
  console.log(colors.red('0===========================0'));

  // 4. AutoPoster
  const ap = AutoPoster(`${topggAPI}`, client);
  ap.on('posted', () => {
    console.log('Stats posted on top.gg');
  });
  ap.on('error', () => {
    console.log('An error occurred while posting stats on top.gg');
  });

  // 5. Final Count Logs
  const serverCount = client.guilds.cache.size;
  const userCount = client.users.cache.size;
  console.log(`userCount: ${userCount}\nserverCount: ${serverCount}`);
});
