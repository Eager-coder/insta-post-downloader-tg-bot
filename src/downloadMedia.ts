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
		await page.setCookie(
			{
				name: "sessionid",
				value: process.env.IG_SESSIONID!,
				url: "https://instagram.com",
				domain: ".instagram.com",
				httpOnly: true,
				secure: true,
			},
			{
				name: "rur",
				value: `"CLN\05451670752190\0541674670688:01f7f17cfbdb38145861d6b061a12ad8ca2ee51bb4a89e2980f68bd3998a8bfd2da58422"`,
				url: "https://instagram.com",
				domain: ".instagram.com",
				httpOnly: true,
				secure: true,
			},
			{
				name: "csrftoken",
				value: `A4fMpSVswp927l6HhK0qSqchbNyie75p`,
				url: "https://instagram.com",
				domain: ".instagram.com",
				httpOnly: false,
				secure: true,
			},
			{
				name: "csrftoken",
				value: `A4fMpSVswp927l6HhK0qSqchbNyie75p`,
				url: "https://instagram.com",
				domain: ".instagram.com",
				httpOnly: false,
				secure: true,
			},
			{
				name: "fbsr_124024574287414",
				value: `ubr53I1KP5l0HTlWuLWPR3feO6r9d07diEuNW1_Ng7o.eyJ1c2VyX2lkIjoiMTAwMDM4MDMzNTAxMjczIiwiY29kZSI6IkFRQ1FSMjlCMHVNeFRGQWN4SG9IbWJrTmJfUEFHa3A2TWFGZU5LOXFidlRUenp6QzNfU2VVclcxNC1lZ0gtUkFIOXBiLW5yR3NlVFNIZkpVWFpNOGkzOC1kY0ZaeGMzRWtPc2dyYU1aZUUxV0JvX01JRllPTUNQUFpYRjR0MFBicl90bk93Yi11LU9NLXM2eEtILXVIeGZZandKRXlRVXR5UnlvWWdWWllwOXJOWlRGLU9RZFE2bE8yaHhZZjRhMUN3Y2lwN1E4WndfTXFGR0hBMmtjZ1dKZFd0UVZfY0pCb0N2UjI4V01ZVGQ0Qk04M3F1N1BKaGx5dG1CZXNsSUxOaGN5UUFIOUtLSmxhQnJhNW9tc01zZnc5aksxUGplOHpWMXUwWlJINDF4QVljdVAyTm9QcmZwUkZ0UElDMmZvazg3T0hxUGtxMzllSW9qUkNFak5vQWhLIiwib2F1dGhfdG9rZW4iOiJFQUFCd3pMaXhuallCQUxMVHlRbzkwdGY1WXNKRTQ4NllyNE9MWkFvRXVNQnV3bm9OTHI5bzBPMFlUWkJHQW5FbHB6TVlFMTdNUm94aEVaQzBCb2VIN3NaQ1pBNXlaQnNVZXZqeG1uZXptTklGNlpCSTFJckhXa3NSWGNLbnFHQTl3dVpCZDJLWkNFUDdVVkFoZTNuRzdGOFFMMGhnODNVWkNUM0FlTFhaQkJTOHpUR05aQ25tN2RYbzc3MTRoUUFZR1BrRTY3OFpEIiwiYWxnb3JpdGhtIjoiSE1BQy1TSEEyNTYiLCJpc3N1ZWRfYXQiOjE2NDMxMzQ1OTR9`,
				url: "https://instagram.com",
				domain: ".instagram.com",
				httpOnly: false,
				secure: true,
				sameSite: "None",
			},
		)

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
		await page.close()
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
		await page.close()
		return { imageLinks, videoLinks }
	}
}
