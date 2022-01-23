import TelegramBot from "node-telegram-bot-api"
import dotenv from "dotenv"
import puppeteer from "puppeteer"
import downloadMedia from "./downloadMedia"
import fs from "fs/promises"
dotenv.config()

const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: true })

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
