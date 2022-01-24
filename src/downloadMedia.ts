import type Puppeteer from "puppeteer"
import fs from "fs/promises"
import axios from "axios"
import fsSync from "fs"
import crypto from "crypto"
import path from "path"

async function downloadFile(fileUrl: string, outputLocationPath: string) {
	const writer = fsSync.createWriteStream(outputLocationPath)
	return axios({
		method: "get",
		url: fileUrl,
		responseType: "stream",
	}).then(response => {
		return new Promise((resolve, reject) => {
			response.data.pipe(writer)
			let error: any = null
			writer.on("error", err => {
				error = err
				writer.close()
				reject(err)
			})
			writer.on("close", () => {
				if (!error) {
					resolve(true)
				}
			})
		})
	})
}

export default async function downloadMedia(browser: Puppeteer.Browser, post_url: string, tempFolder: string) {
	const page = await browser.newPage()
	if (post_url.includes("/stories/")) {
		await page.setCookie({
			name: "sessionid",
			value: process.env.IG_SESSIONID!,
			url: "https://instagram.com",
			domain: ".instagram.com",
			httpOnly: true,
			secure: true,
		})

		await page.goto(post_url)
		await page.waitForSelector("button.sqdOP.L3NKy.y1rQx.cB_4K")
		await page.click("button.sqdOP.L3NKy.y1rQx.cB_4K")
		await page.waitForSelector(".JkC_e.dHJVu")

		let videoLinks = await page.$$eval("video.y-yJ5.OFkrO source", videos => videos.map((video: any) => video.src))
		const imageLinks = await page.$$eval("img.y-yJ5.i1HvM", images => images.map((image: any) => image.src))

		if (videoLinks.length) {
			const tempDir = path.join(__dirname, "../media", tempFolder)
			await fs.mkdir(tempDir, { recursive: true })
			await Promise.all(
				videoLinks.map(link => downloadFile(link, tempDir + "/" + crypto.randomBytes(16).toString("hex") + ".mp4")),
			)
			videoLinks = (await fs.readdir(tempDir)).map(dir => "media/" + tempFolder + "/" + dir)
		}
		return { imageLinks, videoLinks }
	} else {
		await page.goto("https://snapinsta.app/")
		await page.waitForSelector("form#get_video")
		await page.type("form#get_video input#url", post_url)
		await page.click("form#get_video button#send")
		await page.waitForSelector(".row.download-box")
		const results: string[] = await page.$$eval(".row.download-box a.abutton.is-success.btn-premium.mt-3", links =>
			links.map((link: any) => link.href),
		)
		const imageLinks = results.filter(link => link.includes(".jpg"))
		let videoLinks = results.filter(link => !link.includes(".jpg"))

		if (videoLinks.length) {
			const tempDir = path.join(__dirname, "../media", tempFolder)
			await fs.mkdir(tempDir, { recursive: true })
			await Promise.all(
				videoLinks.map(link => downloadFile(link, tempDir + "/" + crypto.randomBytes(16).toString("hex") + ".mp4")),
			)
			videoLinks = (await fs.readdir(tempDir)).map(dir => "media/" + tempFolder + "/" + dir)
		}
		return { imageLinks, videoLinks }
	}
}
