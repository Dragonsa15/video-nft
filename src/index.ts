import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios, { AxiosInstance } from 'axios';
import { Asset, Task } from './types/schema';

type Camel<T extends string> = T extends `${infer Left}-${infer Right}`
	? Camel<`${Left}${Capitalize<Right>}`>
	: T;

type CamelKeys<T> = {
	[K in keyof T as K extends string ? Camel<K> : K]: T[K];
};

export default async function parseCli(argv?: string | readonly string[]) {
	const yargsInst = (await yargs()) as unknown as typeof yargs;
	const parsedRaw = await yargsInst
		.options({
			'api-token': {
				describe: 'ttoken to use for Livepeer API',
				demandOption: true,
				type: 'string'
			},
			'asset-name': {
				describe: 'name for the asset created in Livepeer.com API',
				type: 'string'
			},
			'nft-metadata': {
				describe:
					'additional JSON metadata to override default generated by Livepeer for the NFT',
				type: 'string',
				default: '{}'
			},
			'api-host': {
				describe: 'the endpoint to use for the Livepeer API',
				type: 'string',
				default: 'https://livepeer.com'
			},
			filename: {
				describe: 'file to upload as nft',
				demandOption: true,
				type: 'string'
			}
		})
		.usage(
			`
    Video NFT

    Mint a video NFT in 1 command with Livepeer.
    `
		)
		.env('LP_')
		.strict(process.env.NODE_ENV !== 'test')
		.help()
		.parse((argv as any) ?? hideBin(process.argv));
	if (!parsedRaw.filename) {
		throw new Error('Usage: video-nft <filename>');
	}
	return {
		...(parsedRaw as CamelKeys<typeof parsedRaw>),
		assetName: parsedRaw.assetName ?? path.basename(parsedRaw.filename)
	};
}

class VodClient {
	private client: AxiosInstance;

	constructor(
		private readonly apiHost: string,
		private readonly apiToken: string
	) {
		this.client = axios.create({
			baseURL: apiHost,
			headers: {
				Authorization: `Bearer ${apiToken}`
			},
			maxContentLength: Infinity,
			maxBodyLength: Infinity
		});
		this.client.interceptors.response.use(res => {
			if (res.status >= 300) {
				throw new Error(
					`Error on ${res.config.method} ${res.config.url} (${
						res.status
					} ${res.statusText}): ${JSON.stringify(res.data)}`
				);
			}
			return res;
		});
	}

	async getAsset(id: string) {
		const { data } = await this.client.get<Task>(`/api/asset/${id}`);
		return data;
	}

	async getTask(id: string) {
		const { data } = await this.client.get<Task>(`/api/task/${id}`);
		return data;
	}

	async awaitTask(task: Task) {
		console.log(
			`Waiting for ${task.type} task completion... id=${task.id}`
		);
		let lastProgress = 0;
		while (
			task.status?.phase !== 'completed' &&
			task.status?.phase !== 'failed'
		) {
			const progress = task.status?.progress;
			if (progress && progress !== lastProgress) {
				console.log(` - progress: ${100 * progress}%`);
				lastProgress = progress;
			}
			await new Promise(resolve => setTimeout(resolve, 1000));
			task = await this.getTask(task.id ?? '');
		}

		if (task.status.phase === 'failed') {
			throw new Error(
				`${task.type} task failed. error: ${task.status.errorMessage}`
			);
		}
		return task;
	}

	async requestUploadUrl(assetName: string) {
		const { data } = await this.client.post('/api/asset/request-upload', {
			name: assetName
		});
		return data as { url: string; asset: Asset; task: Task };
	}

	async uploadFile(url: string, filename: string) {
		return await this.client.put(url, fs.createReadStream(filename));
	}

	async exportAsset(id: string, nftMetadata: Object) {
		const { data } = await this.client.post(`/api/asset/${id}/export`, {
			ipfs: { nftMetadata }
		});
		return data as { task: Task };
	}
}

async function videoNft() {
	const args = await parseCli();
	const api = new VodClient(args.apiHost, args.apiToken as string);

	console.log('1. Requesting upload URL... ');
	const {
		url: uploadUrl,
		asset,
		task: importTask
	} = await api.requestUploadUrl(args.assetName);
	console.log(`Pending asset with id=${asset.id}`);

	console.log('2. Uploading file...');
	await api.uploadFile(uploadUrl, args.filename as string);
	await api.awaitTask(importTask);

	console.log('3. Starting export... ');
	let { task: exportTask } = await api.exportAsset(
		asset.id ?? '',
		JSON.parse(args.nftMetadata)
	);
	console.log(`Created export task with id=${exportTask.id}`);
	exportTask = await api.awaitTask(exportTask);

	console.log(
		`4. Export successful! Result: \n${JSON.stringify(
			exportTask.output?.export?.ipfs,
			null,
			2
		)}`
	);
}

videoNft().catch(err => {
	console.error(err);
	process.exit(1);
});
