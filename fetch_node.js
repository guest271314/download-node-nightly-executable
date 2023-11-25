import { UntarFileStream } from "https://gist.githubusercontent.com/guest271314/93a9d8055559ac8092b9bf8d541ccafc/raw/022c3fc6f0e55e7de6fdfc4351be95431a422bd1/UntarFileStream.js";
// deno run -A fetch_node.js
const encoder = new TextEncoder();

async function log(bytes, length) {
  // https://medium.com/deno-the-complete-reference/deno-nuggets-overwrite-a-console-log-line-2513e52e264b
  await Deno.stdout.write(
    encoder.encode(`${bytes} of ${length} bytes written.\r`),
  );
}

try {
  let osArch = "linux-x64";
  let [node_nightly_build] = await (
    await fetch("https://nodejs.org/download/nightly/index.json")
  ).json();
  let { version, files } = node_nightly_build;
  let node_nightly_url =
    `https://nodejs.org/download/nightly/${version}/node-${version}-${osArch}.tar.gz`;
  const request = await fetch(
    node_nightly_url,
  );
  const stream = request.body.pipeThrough(
    new TransformStream({
      start() {
        this.bytesWritten = 0;
        this.length = request.headers.get("content-length");
      },
      async transform(value, controller) {
        controller.enqueue(value);
        await log(this.bytesWritten += value.length, this.length);
      },
      flush() {
        console.log(`\nDone fetching node executable ${version}.`);
      },
    }),
  ).pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const untarFileStream = new UntarFileStream(buffer);
  while (untarFileStream.hasNext()) {
    file = untarFileStream.next();
    if (/\/bin\/node$/.test(file.name)) {
      break;
    }
  }
  await Deno.writeFile("node", new Uint8Array(file.buffer), {
    mode: 0o764,
    create: true,
  });
} catch (e) {
  console.log(e);
}
