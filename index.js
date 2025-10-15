// --- ADMIN BOT (Node.js + discord.js v14) ---
// .env Datei im selben Ordner:
// DISCORD_TOKEN=dein_token
// CLIENT_ID=deine_client_id
// GUILD_ID=deine_guild_id

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  PermissionFlagsBits,
} from 'discord.js';

// Client erstellen
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- Slash Commands definieren ---
const commands = [
  // 1️⃣ Ban
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannt ein Mitglied.')
    .addUserOption(o => o.setName('user').setDescription('Wer soll gebannt werden?').setRequired(true))
    .addStringOption(o => o.setName('grund').setDescription('Grund (optional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  // 2️⃣ Unban
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Entbannt ein Mitglied per ID.')
    .addStringOption(o => o.setName('userid').setDescription('User ID des gebannten Nutzers').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  // 3️⃣ Kick
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kickt ein Mitglied.')
    .addUserOption(o => o.setName('user').setDescription('Wer soll gekickt werden?').setRequired(true))
    .addStringOption(o => o.setName('grund').setDescription('Grund (optional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  // 4️⃣ Timeout
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout für ein Mitglied (z. B. 10m, 1h, 1d).')
    .addUserOption(o => o.setName('user').setDescription('Wer soll stumm geschaltet werden?').setRequired(true))
    .addStringOption(o => o.setName('dauer').setDescription('z. B. 10m, 1h, 1d').setRequired(true))
    .addStringOption(o => o.setName('grund').setDescription('Grund (optional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  // 5️⃣ Untimeout
  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Hebt den Timeout eines Mitglieds auf.')
    .addUserOption(o => o.setName('user').setDescription('Wem soll Timeout entfernt werden?').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  // 6️⃣ Clear
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Löscht eine Anzahl an Nachrichten.')
    .addIntegerOption(o => o.setName('anzahl').setDescription('Wie viele Nachrichten? (1–100)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
].map(cmd => cmd.toJSON());

// --- Slash Commands registrieren ---
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash-Befehle registriert.');
}

// --- Bot gestartet ---
client.once('ready', () => {
  console.log(`🤖 Eingeloggt als ${client.user.tag}`);
});

// --- Befehlslogik ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    // /ban
    if (commandName === 'ban') {
      const user = interaction.options.getUser('user');
      const grund = interaction.options.getString('grund') || 'Kein Grund angegeben.';
      const member = await interaction.guild.members.fetch(user.id);
      await member.ban({ reason: grund });
      await interaction.reply(`🔨 ${user.tag} wurde gebannt. Grund: ${grund}`);
    }

    // /unban
    if (commandName === 'unban') {
      const userId = interaction.options.getString('userid');
      await interaction.guild.members.unban(userId).catch(() => null);
      await interaction.reply(`✅ Nutzer mit ID ${userId} wurde entbannt.`);
    }

    // /kick
    if (commandName === 'kick') {
      const user = interaction.options.getUser('user');
      const grund = interaction.options.getString('grund') || 'Kein Grund angegeben.';
      const member = await interaction.guild.members.fetch(user.id);
      await member.kick(grund);
      await interaction.reply(`👢 ${user.tag} wurde gekickt. Grund: ${grund}`);
    }

    // /timeout
    if (commandName === 'timeout') {
      const user = interaction.options.getUser('user');
      const dauer = interaction.options.getString('dauer');
      const grund = interaction.options.getString('grund') || 'Kein Grund angegeben.';
      const member = await interaction.guild.members.fetch(user.id);

      // Dauer umrechnen
      const match = dauer.match(/^(\\d+)([smhd])$/);
      if (!match) return interaction.reply('❌ Ungültiges Zeitformat! Beispiel: 10m, 1h, 1d');
      const value = parseInt(match[1]);
      const unit = match[2];
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      const ms = value * multipliers[unit];

      await member.timeout(ms, grund);
      await interaction.reply(`⏳ ${user.tag} wurde für ${dauer} stummgeschaltet. Grund: ${grund}`);
    }

    // /untimeout
    if (commandName === 'untimeout') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(null);
      await interaction.reply(`🔊 Timeout für ${user.tag} wurde aufgehoben.`);
    }

    // /clear
    if (commandName === 'clear') {
      const anzahl = interaction.options.getInteger('anzahl');
      if (anzahl < 1 || anzahl > 100) return interaction.reply('❌ Bitte Zahl zwischen 1 und 100 angeben.');
      const messages = await interaction.channel.bulkDelete(anzahl, true);
      await interaction.reply(`🧹 ${messages.size} Nachrichten gelöscht.`);
      setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
    }

  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Fehler bei der Ausführung.', ephemeral: true });
  }
});

// --- Start ---
registerCommands()
  .then(() => client.login(process.env.DISCORD_TOKEN))
  .catch(console.error);
