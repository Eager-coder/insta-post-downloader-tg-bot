import TelegramBot from "node-telegram-bot-api"
import dotenv from "dotenv"
import puppeteer from "puppeteer"
import downloadMedia from "./downloadMedia"
import fs from "fs/promises"
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
				bot.sendMessage(chatId, "Hi! This bot allows you to download instagram posts. Simply send the URL of the post)")
			} else if (msg.text?.includes("https://www.instagram.com/p/")) {
				bot.sendChatAction(chatId, "upload_photo")
				const { imageLinks, videoLinks } = await downloadMedia(browser, msg.text, chatId.toString())
				if (imageLinks.length) {
					await Promise.all(imageLinks.map(link => bot.sendPhoto(chatId, link)))
				}
				if (videoLinks.length) {
					await Promise.all(videoLinks.map(async link => bot.sendDocument(chatId, link)))
					await fs.rm(chatId.toString(), { recursive: true, force: true })
				}
			} else {
				bot.sendMessage(chatId, "Invalid post link.")
			}
		} catch (error) {
			console.log(error)

			bot.sendMessage(chatId, "Something went wrong (((. Please try again later.")
		}
	})
})()
