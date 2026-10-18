import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import QRCode from 'qrcode';

/**
 * `pnpm qr [url]`: writes docs/qr.png, a QR code for the site. Without a URL it reads the
 * DadJokes stack's WebUrl output (needs AWS credentials for the account).
 */
async function siteUrl(): Promise<string> {
  const arg = process.argv[2];
  if (arg) return arg;
  const cf = new CloudFormationClient({ region: 'us-east-2' });
  const out = await cf.send(new DescribeStacksCommand({ StackName: 'DadJokes' }));
  const url = out.Stacks?.[0]?.Outputs?.find((o) => o.OutputKey === 'WebUrl')?.OutputValue;
  if (!url) throw new Error('The DadJokes stack has no WebUrl output: deploy it first.');
  return `${url}/`;
}

const url = await siteUrl();
await QRCode.toFile('docs/qr.png', url, {
  width: 1024,
  margin: 2,
  errorCorrectionLevel: 'M',
  color: { dark: '#1d1b2fff', light: '#ffffffff' },
});
console.log(`docs/qr.png -> ${url}`);
