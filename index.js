const axios = require('axios')
const Discord = require('discord.js')

const client = new Discord.Client()
const apiUrl = `https://api-inference.huggingface.co/models/${process.env.MODEL_NAME}`;
const watchedChannels = []

const getRandomRange = (start, end) => {
  return start + Math.floor(Math.random() * (end - start));
}

const setTimedWatch = (channelId, length) => {
  return new Promise(_ => {
    setTimeout(() => {
      const index = watchedChannels.indexOf(channelId);
      if (index > -1) {
        watchedChannels.splice(index, 1);
      }
    },
      length)
  })
}

getMentions = (mention) => {
  // The id is the first and only match found by the RegEx.
  const matches = mention.match(Discord.MessageMentions.USERS_PATTERN);

  // If supplied variable was not a mention, matches will be null instead of an array.
  if (!matches) return;

  return matches
}

messageHasMention = (message, userid) => {
  const mentions = getMentions(message.content)
  if (!mentions || mentions.length <= 0) {
    return false
  }

  return mentions.some(m => m.includes(userid))
}

const botTalk = async (message) => {
  const mentions = getMentions(message.content)
  let cleanedMessage = message.content

  if (mentions) {
    mentions.forEach(mention => {
      cleanedMessage = cleanedMessage.split(mention).join("").trim()
    })
  }
  cleanedMessage.replace(/\s{2,}/g, ' ')

  // if this message only contains emoji
  if (cleanedMessage.startsWith("<:") && cleanedMessage.endsWith(">")) {
    return
  }

  const response = await axios.post(
    apiUrl,
    {
      inputs: {
        text: cleanedMessage
      }
    },
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.HUGGINGFACE_KEY
      }
    }
  )
  const reply = response.data.generated_text || "sorry, I don't get it"
  if (reply.match(/\:.*\:/g)) {
    const emojis = client.emojis.cache.array()
    return message.channel.send(emojis[getRandomRange(0, emojis.length)].toString());
  }
  else {
    return message.channel.send(reply)
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity(`@me`, { type: "LISTENING" })
})

client.on('error', console.error)

client.on('message', async (message) => {
  if (message.author.bot) return

  if (message.content.includes('@here') || message.content.includes('@everyone')) return

  if (messageHasMention(message, client.user.id)) {
    if (message.author.id === process.env.OWNER_ID && // owner
      ['watch', 'this', 'channel'].every(val => message.content.includes(val))) {
      watchedChannels.push(message.channel.id)
      const confirm = ['Okay!', 'OK', 'alright', 'yeah', 'Mhm', 'k', "I'm watching", "On it", ":)", "smile", "nah yeah", "ya", "ok buddy"]
      return message.channel.send(confirm[getRandomRange(0, confirm.length)])
    }

    if (!watchedChannels.includes(message.channel.id)) {
      watchedChannels.push(message.channel.id)
      await setTimedWatch(message.channel.id, 60000)
    }

    if (['meow', 'nyaa', 'cat', 'psps'].some(val => message.content.toLowerCase().includes(val))) {
      const response = ['MEOW', 'meow', 'nyaaaaa!', 'mroooow', "I'm a cat!", 'cat cat cat!', 'mewo', 'woof!', 'uwu', 'MEOWWWWW', 'MEEOOOWWW', 'Meow!']
      return message.channel.send(response[getRandomRange(0, response.length)])
    }

    try {
      message.channel.startTyping()
      await botTalk(message)
      return message.channel.stopTyping()
    }
    catch (e) {
      console.error(e)
      message.channel.send(`Sorry, my brain isn't working right now, can't talk :(`)
      return message.channel.stopTyping()
    }
  }

  if (watchedChannels.includes(message.channel.id)) {
    // Random probability bot will reply without being pinged
    if (0.2 > Math.random()) {
      try {
        message.channel.startTyping()
        await botTalk(message)
        return message.channel.stopTyping()
      }
      catch (e) {
        console.error(e)
        return message.channel.stopTyping()
      }
    }
  }
  return
})

client.login(process.env.BOT_TOKEN)