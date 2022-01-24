import TelegramBot from "node-telegram-bot-api"
import dotenv from "dotenv"
import puppeteer from "puppeteer"
import downloadMedia from "./downloadMedia"
import fs from "fs/promises"
import crypto from "crypto"
import path from "path"

dotenv.config()

const port = Number(process.env.PORT!) || 443
const host = "0.0.0.0"
const externalUrl = process.env.SERVER_URL
const token = process.env.BOT_TOKEN!

let bot: TelegramBot
if (process.env.NODE_ENV === "production") {
	bot = new TelegramBot(token, { webHook: { host, port } })
	bot.setWebHook(externalUrl + ":443/bot" + token)
} else {
	bot = new TelegramBot(token, { polling: true })
}

;(async () => {
	const browser = await puppeteer.launch({
		args: ["--no-sandbox"],
	})
	bot.on("message", async msg => {
		const chatId = msg.chat.id
		try {
			if (msg.text === "/start") {
				bot.sendMessage(
					chatId,
					"Hi! This bot allows you to download instagram posts, reels and stories. Simply send the link)",
				)
			} else if (
				msg.text?.match(/\/p\/(.*?)\//) ||
				msg.text?.match(/\/tv\/(.*?)\//) ||
				msg.text?.match(/\/reel\/(.*?)\//) ||
				msg.text?.match(/\/stories\/(.*?)\//)
			) {
				bot.sendChatAction(chatId, "upload_photo")
				const tempFolder = crypto.randomUUID()

				const { imageLinks, videoLinks } = await downloadMedia(browser, msg.text, tempFolder)
				if (imageLinks.length) {
					await Promise.all(imageLinks.map(link => bot.sendPhoto(chatId, link)))
				}
				if (videoLinks.length) {
					await Promise.all(videoLinks.map(async link => bot.sendDocument(chatId, link)))
					await fs.rm(path.join(__dirname, "../media/" + tempFolder), { recursive: true, force: true })
				}
			} else {
				bot.sendMessage(chatId, "Invalid post link.")
			}
		} catch (error) {
			console.log(error)
			bot.sendMessage(chatId, "Something went wrong (. Please try again later.")
		}
	})
})()
