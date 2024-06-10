const {
  Client,
  ChannelType,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} = require("@discordjs/voice");
const fs = require("fs");
require("dotenv").config();
const path = require("path");

var http = require("http");
http
  .createServer(function (req, res) {
    res.write("med1one ( Mohammed )");
    res.end();
  })
  .listen(8081);

const client = new Client({
  intents: Object.values(GatewayIntentBits),
});

const {
  channelID: channelIdToJoin,
  textChannelID,
  supportRoleID,
  categoryID,
  timeout,
  mp3File,
} = require("./config.json");
const mp3FilePath = path.resolve(mp3File);

const lastInteractions = new Map();
let isPlaying = false;
let connection; // Store the connection globally

async function joinVoiceChannelAndPlay() {
  try {
    const channel = client.channels.cache.get(channelIdToJoin);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      console.error(
        "Invalid voice channel ID or the bot cannot find the channel.",
      );
      return null;
    }

    connection = joinVoiceChannel({
      channelId: channelIdToJoin,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    return connection;
  } catch (error) {
    console.error(error);
    return null;
  }
}

client.once("ready", async () => {
  console.log("Bot is ready");

  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      if (newState.member.user.bot) {
        return;
      }

      if (oldChannel && oldChannel.id === channelIdToJoin) {
        // User left the voice channel
        if (oldChannel.members.size === 0) {
          // Disconnect if there are no more users in the channel
          connection.destroy();
          connection = null;
          isPlaying = false;
        }
      }

      if (newChannel && newChannel.id === channelIdToJoin) {
        // User joined the voice channel
        if (!isPlaying && !connection && newChannel.members.size === 1) {
          // Only connect and play audio if not already playing and it's the first user
          const textChannel = client.channels.cache.get(textChannelID);
          if (textChannel) {
            textChannel.send(
              `- Hey, <@&${supportRoleID}>, ${newState.member.user} Is waiting For verification, go verify him`,
            );
          }

          connection = await joinVoiceChannelAndPlay();
          if (connection) {
            const player = createAudioPlayer();
            connection.subscribe(player);
            const resource = createAudioResource(
              fs.createReadStream(mp3FilePath),
            );
            player.play(resource);
            isPlaying = true;

            // Listen for when the file finishes playing
            player.on("stateChange", (oldState, newState) => {
              if (newState.status === "online") {
                // Log when the file finishes playing
                console.log("Finished playing .mp3 file.");

                // Wait for 2 seconds before disconnecting
                setTimeout(() => {
                  // Disconnect from the channel
                  connection.destroy();
                  connection = null; // Reset connection
                  isPlaying = false; // Reset isPlaying flag
                }, 2000);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error("An error occurred:", error);
      // You can add additional error handling or logging here
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "support_button") {
      const currentTime = Date.now();
      const cooldownAmount = 3 * 60 * 1000;

      if (lastInteractions.has(interaction.user.id)) {
        const lastInteractionTime = lastInteractions.get(interaction.user.id);
        const timePassed = currentTime - lastInteractionTime;

        if (timePassed < cooldownAmount) {
          const timeLeft = (cooldownAmount - timePassed) / 1000;
          await interaction.reply({
            content: `- Please wait for \`${timeLeft.toFixed(
              1,
            )}\` After ping the verification staff again.`,
            ephemeral: true,
            flags: [4096],
          });
          return;
        }
      }

      lastInteractions.set(interaction.user.id, currentTime);

      const textChannel = client.channels.cache.get(textChannelID);
      if (textChannel) {
        textChannel.send(
          `- Hey <@&${supportRoleID}>, ${interaction.user} is waiting for verification, go verify him`,
        );
      }
      await interaction.reply({
        content: "- The ping is successfully sent. Wait for a moment.",
        ephemeral: true,
        flags: [4096],
      });
    }
  });
});

client.login(process.env.token);

// Handles errors and avoids crashes, better not to remove them.
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);



/**
 * Project: Verification-Joiner
 * Author: @medone-1
 * this code is under the MIT license.
 * For more information, contact us at
 * https://discord.gg/ecliptic
 */


