import { getHttpEndpoint } from "@orbs-network/ton-gateway";
import BN from "bn.js";
import { Address, Cell, TonClient } from "ton";
import { makeGetCall } from "./makeGetCall";
const SOURCE_REG = "EQD-BJSVUJviud_Qv7Ymfd3qzXdrmV525e3YDzWQoHIAiInL";
import fetch from "node-fetch";

(async () => {
  const tc = new TonClient({ endpoint: await getHttpEndpoint() });
  const txns = await tc.getTransactions(Address.parse(SOURCE_REG), {
    limit: 1000,
  });

  console.log("Got txns", txns.length);

  const destinations = txns
    .filter((t) => t.outMessages?.[0]?.destination)
    .map((t) => t.outMessages[0].destination!);

  console.log(
    `Got ${
      destinations.length
    } destinations, example: ${destinations[0].toFriendly()}`
  );

  for (const d of destinations) {
    const result = await makeGetCall(
      d,
      "get_source_item_data",
      [],
      async (s) => {
        const ipfsLinkSlice = (s[3] as Cell).beginParse();
        const ver = ipfsLinkSlice.readUint(8).toNumber();
        if (ver !== 1) {
          console.warn("Unsupported version");
        }

        const ipfsLink = ipfsLinkSlice.readRemainingBytes().toString();

        const json = await (
          await fetch(
            `https://tonsource.infura-ipfs.io/ipfs/${ipfsLink.replace(
              "ipfs://",
              ""
            )}`
          )
        ).json();

        return {
          codeCellHash: (s[1] as BN).toBuffer().toString("base64"),
          address: json.knownContractAddress,
          cmd: json.compilerSettings.commandLine,
        };
      },
      tc
    );
    console.log(result);
  }
})();
