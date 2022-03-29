import VodApi from './api';
import { getDesiredProfile } from './transcode';
import {LivepeerUploadProfile} from './types/schema';

require('dotenv').config()

let apiKey = process.env.API_KEY || ""
let apiEndpoint = 'https://livepeer.com'
let assetname = "testing1234"
let filename = "./static/Videos/1 v 4 To keep The Dream Alive (Saksham).mp4"
let metadata = `{
	"attributes" : "1 v 4 clutch on Icebox",
	"owner" : "Saksham"
}`

export async function videoNft(assetName:string ,filename:string,metadata:string): Promise<LivepeerUploadProfile | undefined> {
	const api = new VodApi(apiKey, apiEndpoint);

	console.log('1. Requesting upload URL... ');
	const {
		url: uploadUrl,
		asset: { id: assetId },
		task: importTask
	} = await api.requestUploadUrl(assetName);
	console.log(`Pending asset with id=${assetId}`);

	console.log('2. Uploading file...');
	await api.uploadFile(uploadUrl, filename as string);
	await api.waitTask(importTask);

	let asset = await api.getAsset(assetId ?? '');
	const desiredProfile = await getDesiredProfile(asset);
	if (desiredProfile) {
		console.log(
			`3. Transcoding asset to ${desiredProfile.name} at ${Math.round(
				desiredProfile.bitrate / 1024
			)} kbps bitrate`
		);
		const transcode = await api.transcodeAsset(asset, desiredProfile);
		await api.waitTask(transcode.task);
		asset = transcode.asset;
	}

	console.log('3. Starting export... ');
	let { task: exportTask } = await api.exportAsset(
		asset.id ?? '',
		JSON.parse(metadata)
	);
	console.log(`Created export task with id=${exportTask.id}`);
	exportTask = await api.waitTask(exportTask);

	const result = exportTask.output?.export?.ipfs;
	console.log(
		`4. Export successful! Result: \n${JSON.stringify(result, null, 2)}`
	);
	
	return new Promise(async (resolve,reject) => {
		resolve(result);
	});

	console.log(
		`5. Mint your NFT at:\n` +
			`https://livepeer.com/mint-nft?tokenUri=${result?.nftMetadataUrl}`
	);
}

// videoNft(assetname,filename,metadata).catch(err => {
// 	console.error(err);
// 	process.exit(1);
// });
