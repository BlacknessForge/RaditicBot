const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Multiplier calculation with house edge (3%)
function calculateMultiplier(mines, revealed) {
    let multiplier = 1;
    const totalTiles = 25;
    for (let i = 0; i < revealed; i++) {
        multiplier *= (totalTiles - i) / (totalTiles - mines - i);
    }
    return multiplier * 0.97;
}

// Generate the 5x5 grid rows (24 playable tiles + 1 Cash Out button in row 5)
function buildGrid(mineLocations, revealedTiles, gameOver = false, won = false) {
    const rows = [];
    let tileId = 0;

    for (let r = 0; r < 5; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 5; c++) {
            // Place Cash Out button on the 25th tile position (Bottom-Right corner)
            if (r === 4 && c === 4) {
                const cashoutButton = new ButtonBuilder()
                    .setCustomId('mines_cashout')
                    .setLabel('💰 Cash Out')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(gameOver || revealedTiles.length === 0);
                row.addComponents(cashoutButton);
                continue;
            }

            const button = new ButtonBuilder().setCustomId(`mines_tile_${tileId}`);

            if (revealedTiles.includes(tileId)) {
                button.setEmoji('💎').setStyle(ButtonStyle.Primary).setDisabled(true);
            } else if (gameOver) {
                if (mineLocations.includes(tileId)) {
                    button.setEmoji('💥').setStyle(ButtonStyle.Danger).setDisabled(true);
                } else {
                    button.setEmoji('⬛').setStyle(ButtonStyle.Secondary).setDisabled(true);
                }
            } else {
                button.setEmoji('❓').setStyle(ButtonStyle.Secondary);
            }

            row.addComponents(button);
            tileId++;
        }
        rows.push(row);
    }
    return rows;
}

module.exports = {
    name: 'mines',
    description: 'Play the Mines gambling game for RadiGems!',
    async execute(message, args, db) {
        const bet = parseInt(args[0]);
        const mineCount = parseInt(args[1]);
        const userId = message.author.id;

        // Input Validation
        if (isNaN(bet) || isNaN(mineCount)) {
            return message.reply('❌ Invalid syntax! Usage: `!mines <bet_amount> <mines_count>` (e.g., `!mines 100 3`)');
        }

        if (bet < 10) {
            return message.reply('❌ Minimum bet is **10** RadiGems!');
        }

        if (mineCount < 1 || mineCount > 24) {
            return message.reply('❌ Mine count must be between **1** and **24**!');
        }

        // Fetch user balance
        const user = await db.getUser(userId);
        if (!user || user.balance < bet) {
            return message.reply(`❌ You don't have enough RadiGems! Your bet is **${bet}**, but you only have **${user?.balance || 0}**.`);
        }

        // Deduct bet atomically
        await db.updateBalance(userId, -bet);

        // Randomly place mines across 24 playable tiles (0 to 23)
        const mineLocations = [];
        while (mineLocations.length < mineCount) {
            const loc = Math.floor(Math.random() * 24);
            if (!mineLocations.includes(loc)) mineLocations.push(loc);
        }

        const revealedTiles = [];
        let isGameOver = false;

        const embed = new EmbedBuilder()
            .setTitle('💣 Raditic Mines Grid')
            .setColor('#9D4EDD')
            .setDescription(`**Player:** <@${userId}>\n**Bet:** 💎 \`${bet}\` RadiGems\n**Mines:** 💣 \`${mineCount}\`\n**Current Multiplier:** \`1.00x\`\n**Current Payout:** 💎 \`${bet}\``)
            .setFooter({ text: 'Click ❓ to reveal a tile or 💰 to Cash Out!' });

        const response = await message.reply({
            embeds: [embed],
            components: buildGrid(mineLocations, revealedTiles)
        });

        // Collect component button clicks strictly from the command author
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000 // 2 minute timeout
        });

        collector.on('collect', async i => {
            if (i.customId === 'mines_cashout') {
                isGameOver = true;
                const finalMultiplier = calculateMultiplier(mineCount, revealedTiles.length);
                const payout = Math.floor(bet * finalMultiplier);

                await db.updateBalance(userId, payout);

                embed.setTitle('🎉 Cashed Out!')
                    .setColor('#00F0FF')
                    .setDescription(`You safely cashed out!\n\n**Tiles Cleared:** \`${revealedTiles.length}\`\n**Final Multiplier:** \`${finalMultiplier.toFixed(2)}x\`\n**Total Won:** 💎 \`${payout}\` RadiGems`);

                await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true, true) });
                return collector.stop('cashed_out');
            }

            const tileIndex = parseInt(i.customId.replace('mines_tile_', ''));

            if (mineLocations.includes(tileIndex)) {
                // Hit a mine
                isGameOver = true;
                embed.setTitle('💥 BOOM! Game Over')
                    .setColor('#FF0000')
                    .setDescription(`You hit a mine on tile \`#${tileIndex + 1}\`!\n\n**Loss:** 💎 \`${bet}\` RadiGems`);

                await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true, false) });
                return collector.stop('hit_mine');
            } else {
                // Safe tile revealed
                revealedTiles.push(tileIndex);
                const currentMultiplier = calculateMultiplier(mineCount, revealedTiles.length);
                const currentPayout = Math.floor(bet * currentMultiplier);

                // Auto cashout if all safe tiles are cleared
                if (revealedTiles.length === 24 - mineCount) {
                    isGameOver = true;
                    await db.updateBalance(userId, currentPayout);

                    embed.setTitle('🏆 PERFECT CLEAR!')
                        .setColor('#00F0FF')
                        .setDescription(`You revealed all safe tiles!\n\n**Final Multiplier:** \`${currentMultiplier.toFixed(2)}x\`\n**Total Won:** 💎 \`${currentPayout}\` RadiGems`);

                    await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true, true) });
                    return collector.stop('cleared');
                }

                embed.setDescription(`**Player:** <@${userId}>\n**Bet:** 💎 \`${bet}\` RadiGems\n**Mines:** 💣 \`${mineCount}\`\n**Current Multiplier:** \`${currentMultiplier.toFixed(2)}x\`\n**Current Payout:** 💎 \`${currentPayout}\``);

                await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles) });
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time' && !isGameOver) {
                // Auto cash out current earnings on timeout
                const finalMultiplier = revealedTiles.length > 0 ? calculateMultiplier(mineCount, revealedTiles.length) : 1;
                const payout = Math.floor(bet * finalMultiplier);
                if (payout > 0) await db.updateBalance(userId, payout);

                embed.setTitle('⏰ Game Timed Out')
                    .setColor('#FFA500')
                    .setDescription(`The game timed out. Automatically cashed out 💎 \`${payout}\` RadiGems.`);

                await response.edit({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true) });
            }
        });
    }
};
  
