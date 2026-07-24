const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { color, emoji, getPrefix } = require('../../config');

module.exports = {
  usage: 'help',
  name: 'help',
  description: 'Shows list of available commands',
  async execute({ msg, client }) {
    const customEmojis = {
      "MiniGames": "1286947790957842452",
      "Economy": "1329065211940044820",
      "Moderation": "1286947195509276692",
      "Utils": "1286947168024002654",
      "Info": "1286947107856711751",
      "homepage": "1286947014633984041",
      "Fun": "1286947134641274982",
      "Music": "1289450507554914324"
    };

    const prefix = msg.guild ? await getPrefix(msg.guild.id) : 'r.'; 
    const commands = Array.from(client.commands.values());
    const categories = [];

    // Step 1: Dynamically extract and normalize category names from folders
    for (const command of commands) {
      if (!command.category) continue;
      
      // Ignore developer commands
      if (command.category.toLowerCase().includes('developer-only')) continue;

      // Cleanly separate emoji and clean category name
      const parts = command.category.trim().split(/\s+/);
      const cleanName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
      const folderEmoji = parts.length > 1 ? parts[0] : '📁';

      if (!cleanName) continue;

      // Check if custom Guild Emoji exists in config mapping
      const guildEmoji = client.emojis.cache.get(customEmojis[cleanName]);
      const categoryEmoji = (guildEmoji ? { name: guildEmoji.name, id: guildEmoji.id, animated: guildEmoji.animated } : false) 
        || { name: folderEmoji };

      if (!categories.find(cat => cat.name === cleanName)) {
        categories.push({
          rawCategory: command.category,
          name: cleanName,
          emoji: categoryEmoji
        });
      }
    }

    // Step 2: Build Category Embeds dynamically
    const embeds = [];
    for (const category of categories) {
      const commandsInCategory = commands.filter(cmd => cmd.category === category.rawCategory);
      
      const commandList = commandsInCategory.map(cmd => ({ 
        name: `${cmd.name} | \`${prefix}${cmd.usage || cmd.name}\``, 
        value: cmd.description || 'No description provided.', 
        inline: false 
      }));

      const categoryEmbed = new EmbedBuilder()
        .setColor(`${color.default}`)
        .setTitle(`${category.emoji.id ? `<${category.emoji.animated ? 'a' : ''}:${category.emoji.name}:${category.emoji.id}>` : category.emoji.name} ${category.name} Commands`)
        .setDescription(`> ${emoji.search} **__Available ${category.name} commands list__**`)
        .setAuthor({
          name: msg.guild?.name || 'Raditic Bot',
          iconURL: msg.guild?.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
        })
        .setFooter({ text: `Requested by ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
        .addFields(commandList.slice(0, 25))
        .setTimestamp();
        
      embeds.push(categoryEmbed);
    }

    // Step 3: Setup Homepage & Dropdown Menu Options
    const homepageEmoji = client.emojis.cache.get(customEmojis['homepage']);
    
    const options = [
      { 
        label: 'HomePage', 
        description: 'Back to HomePage', 
        emoji: (homepageEmoji ? { name: homepageEmoji.name, id: homepageEmoji.id, animated: homepageEmoji.animated } : false) || { name: '🏠' }, 
        value: 'homepage' 
      }, 
      ...categories.map(({ name, emoji }, index) => ({
        label: String(name),
        description: `View ${name} commands`,
        emoji,
        value: String(index)
      }))
    ];

    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('helpCommand')
          .setPlaceholder('Select a category')
          .addOptions(options.slice(0, 25))
      );

    const helpEmbed = new EmbedBuilder()
      .setColor(`${color.default}`)
      .setTitle('Help Menu')
      .setAuthor({
        name: msg.guild?.name || 'Raditic Bot',
        iconURL: msg.guild?.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
      })
      .setFooter({ text: `Requested by ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(`${emoji.dot} *An all-in-one Discord bot to enhance your server with versatile features and interactive fun.*\n\n**\`\`\`<> - Required Arguments | [] - Optional Arguments\`\`\`**\n\n${emoji.search} **__My Available Commands Category__**\n> ${(homepageEmoji ? `<${homepageEmoji.animated ? 'a' : ''}:${homepageEmoji.name}:${homepageEmoji.id}>` : '🏠')} : **HomePage**\n> ${categories.map(({ name, emoji }) => `${emoji.id ? `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>` : emoji.name} : **${name}**`).join('\n> ')}\n\n**Links:**\n__[Invite Me](https://discord.com/oauth2/authorize?client_id=1233698268584870010&permissions=2416004096&integration_type=0&scope=bot+applications.com)__ • __[Support Server](https://discord.com/invite/xwG8rtzmzA)__ • __[Privacy Policy](https://gist.github.com/BlacknessForge/035147b87146031330ebf71b08cbd1fd)__ • __[Terms of Service](https://gist.github.com/BlacknessForge/bbfcf0ec02937e665e1c6e079f669b62)__ • __[Top.gg](https://top.gg/bot/1233698268584870010)__`)
      .setTimestamp();

    const response = await msg.channel.send({ embeds: [helpEmbed], components: [row] });
    
    // Step 4: Component Collector Handling
    try {
      const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect,
        time: 480000 
      });
      
      collector.on('collect', async i => {
        if (i.customId !== 'helpCommand') return;
        
        if (i.user.id !== msg.author.id) {
          return i.reply({ content: `❌ That's not your help menu! Create one with \`${prefix}help\``, ephemeral: true });
        }
        
        const value = i.values[0];
        
        if (value !== 'homepage') {
          await i.update({ embeds: [embeds[parseInt(value)]], components: [row] });
        } else {
          await i.update({ embeds: [helpEmbed], components: [row] });
        }
      });
      
      collector.on('end', async () => {
        await response.edit({ 
          content: `⏳ Help menu timed out. Try using \`${prefix}help\` again.`, 
          components: [] 
        }).catch(() => {});
      });
      
    } catch (error) {
      console.error("Help Command Collector Error: ", error);
    }
  },
};
