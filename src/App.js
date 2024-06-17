import './App.css'
import { Button, Upload } from 'antd'
import registerWallet, { generateNft } from './services/Web3Service'
import { useState } from 'react'
import { UploadOutlined } from '@ant-design/icons'
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react'
import {
  Metaplex,
  bundlrStorage,
  toMetaplexFile,
  walletAdapterIdentity,
} from '@metaplex-foundation/js'
// import { Program, AnchorProvider, BN, web3 } from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js'
import { WalletModalButton } from '@solana/wallet-adapter-react-ui'

import idl from './idl.json'

const opts = anchor.AnchorProvider.defaultOptions();

const programID = new PublicKey('H14DxkKaDB7NwnL9Dapkgis319iWE58MPSRFrZEqJfaf')

const [globalLevel1DataAccount, bump] = await anchor.web3.PublicKey.findProgramAddress(
  [Buffer.from('level1', 'utf8')],
  //[pg.wallet.publicKey.toBuffer()], <- You could also add the player wallet as a seed, then you would have one instance per player. Need to also change the seed in the rust part
  programID
)

function App() {
  const [verification, setVerification] = useState(false)
  const [fileList, setFileList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [tokenMint, setTokenMint] = useState('')

  const { wallet, connect } = useWallet()
  const anchorWallet = useAnchorWallet()

  const handleGenerateNFT = async () => {
    generateNft()
  }

  const generateNft = async () => {
    await connect()

    // Connection endpoint, switch to a mainnet RPC if using mainnet
    const ENDPOINT = clusterApiUrl('devnet')

    // Devnet Bundlr address
    const BUNDLR_ADDRESS = 'https://devnet.bundlr.network'

    const connection = new Connection(ENDPOINT)

    const nfts = Metaplex.make(connection, { cluster: 'devnet' })
      .use(walletAdapterIdentity(wallet.adapter))
      .use(
        bundlrStorage({
          address: BUNDLR_ADDRESS,
          providerUrl: ENDPOINT,
          timeout: 60000,
        })
      )
      .nfts()

    const pdfFile = await fileList[0].arrayBuffer()
    const file = toMetaplexFile(pdfFile, 'image.pdf')

    const uploadedMetadata = await nfts.uploadMetadata({
      name: 'Company',
      email: 'user12345@gmail.com',
      user: 'User12345',
      symbol: 'DOCUMENT_SIGNING',
      description: 'Document to sign',
      files: [file, file, file],
    })

    console.log(`Uploaded metadata: ${uploadedMetadata.uri}`)

    const { nft } = await nfts.create(
      {
        uri: uploadedMetadata.uri,
        name: 'User12345 Document Signing',
        sellerFeeBasisPoints: 0, // Represents 0%
        isMutable: false,
      },
      {
        commitment: 'finalized',
      }
    )

    console.log(
      `Token Mint: https://solscan.io/address/${nft.address.toString()}?cluster=devnet`
    )

    const company = 'San Miguel'
    // Save NFT transaction to database
    console.log('saving nft mint address to database')
    await saveNftMintAddress(
      `https://solscan.io/address/${nft.address.toString()}?cluster=devnet`,
      company
    )

    // generate transaction link to include in the email notifications

    // send notification email/s with link for signing
    // Send notifications to board members
    console.log('sending notifications')
    await sendNotifications()

    setTokenMint(
      `https://solscan.io/address/${nft.address.toString()}?cluster=devnet`
    )
  }

  // TODO
  const saveNftMintAddress = async (nftMintAddress, company) => {}
  // TODO
  const sendNotifications = async () => {}

  const callTransaction = async () => {
    // Connection endpoint, switch to a mainnet RPC if using mainnet
    const ENDPOINT = clusterApiUrl('devnet')

    // Devnet Bundlr address
    const BUNDLR_ADDRESS = 'https://devnet.bundlr.network'

    const connection = new Connection(ENDPOINT, "confirmed")

    // const provider = new AnchorProvider(connection, anchorWallet, opts.preflightCommitment)
    const provider = new anchor.AnchorProvider(connection, anchorWallet, anchor.AnchorProvider.defaultOptions());

    const program = new Program(idl, programID, provider)

    console.log(program)

    let txHash;
    let dataAccount;

    try {
      dataAccount = await program.account.dataAccount.fetch(
        globalLevel1DataAccount
      );

      console.log(dataAccount)
    } catch {
      // Check if the account is already initialized, other wise initilalize it
      txHash = await program.methods
        .initialize()
        .accounts({
          newDataAccount: globalLevel1DataAccount,
          signer: wallet.publicKey,
          systemProgram: programID,
        })
        .rpc();
    
      console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
      await connection.confirmTransaction(txHash);
      console.log("Signing Documents");
    }

    console.log('wallet', wallet)
    console.log('anchorWallet', anchorWallet)
    
    // let latestBlockhash = await connection.getLatestBlockhash('finalized');

    // const transaction = new Transaction()

// txHash = await program.methods
// .signDocuments()
// .accounts({
//   dataAccount: globalLevel1DataAccount,
// })
// .rpc();

txHash = await program.methods
  .signDocuments()
  .accounts({
    dataAccount: globalLevel1DataAccount,
  })
  .rpc();
// console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
await connection.confirmTransaction(txHash);

console.log(
  `Signature Txn: https://solscan.io/tx/${txHash.toString()}?cluster=devnet`
)

dataAccount = await program.account.dataAccount.fetch(
globalLevel1DataAccount
);

console.log("Signing status is: ", dataAccount.signingStatus.toString());

switch (dataAccount.signingStatus) {
case 0:
  console.log("Your signing status is 0");
  console.log("Not signed yet");
  break;
case 1:
  console.log("Your signing status is 1");
  console.log("Confirmed by signing");
  break;
}
  }

  const register = async () => {
    console.log('globalLevel1DataAccount', globalLevel1DataAccount)
    console.log('isconnect', wallet)
    // console.log('isconnect', wallet.adapter.connected)
    connect()
    const ver = await registerWallet()
    // console.log('ver: ', ver)
    setVerification(ver)
  }

  const props = {
    onRemove: (file) => {
      const index = fileList.indexOf(file)
      const newFileList = fileList.slice()
      newFileList.splice(index, 1)
      setFileList(newFileList)
    },
    beforeUpload: (file) => {
      console.log(file)
      setFileList([...fileList, file])

      return false
    },
    fileList,
  }

  return (
    <div className="App">
      <ul>
        <li>
          <a className="active" href="#home">
            <img
              src="https://i.imgur.com/Vuoulwy.png"
              alt="sec-logo"
              className="me-2"
              style={{ height: '35px' }}
            />
          </a>
        </li>
      </ul>
      {!verification ? (
        <div style={{ padding: 10 }}>
          <div>
            <WalletModalButton />
          </div>
          <div>
            <Button type="primary" onClick={register}>
              Register Wallet to SEC
            </Button>
          </div>
        </div>
      ) : !tokenMint ? (
        <>
          <div>Welcome User12345 (user12345@gmail.com)</div>
          <div>
            <Upload {...props}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </div>
          <div>
            <Button
              type="primary"
              disabled={fileList.length === 0}
              onClick={handleGenerateNFT}
            >
              Generate NFT Contract for signing
            </Button>
          </div>
        </>
      ) : (
        <>
          <div>
            <Button
              type="primary"
              onClick={callTransaction}
            >
              Sign Documents for confirmation
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
