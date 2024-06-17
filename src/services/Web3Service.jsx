import { useWallet, Wallet } from '@solana/wallet-adapter-react'
import http from '../shared/http'
import {
  Connection,
  Transaction,
  clusterApiUr,
  clusterApiUrl,
} from '@solana/web3.js'
import {
  Metaplex,
  bundlrStorage,
  keypairIdentity,
  walletAdapterIdentity,
} from '@metaplex-foundation/js'

const getProvider = () => {
  // Check for Phantom wallet
  if ('phantom' in window) {
    const phantomProvider = window.phantom?.solana
    if (phantomProvider?.isPhantom) {
      return phantomProvider
    }
  }

  // Check for Sollet wallet
  if ('sollet' in window) {
    const solletProvider = window.sollet?.solana
    if (solletProvider?.isSollet) {
      return solletProvider
    }
  }

  // Check for Solflare wallet
  if ('solflare' in window) {
    const solflareProvider = window.solflare?.solana
    if (solflareProvider?.isSolflare) {
      return solflareProvider
    }
  }

  // If no supported wallet is detected, open the default wallet (Phantom) website
  window.open('https://phantom.app/', '_blank')
}

export const sendEmailsForSigningTransaction = async () => {}

export const generateNft2 = async (wallet) => {
  // Connect the wallet and get the public key
  const connection = new Connection(clusterApiUrl('devnet'))

  const provider = getProvider()
  // const wallet = await provider.request({ method: 'connect' })
  const walletAddress = provider.publicKey.toString()

  // const wallet = useWallet();
  // metaplex.use(walletAdapterIdentity(wallet));

  console.log('connection', wallet)
  await wallet.connect()

  const metaplex = new Metaplex(connection, wallet)
  metaplex.use(walletAdapterIdentity(wallet)).use(
    bundlrStorage({
      address: 'https://devnet.bundlr.network',
      providerUrl: 'https://api.devnet.solana.com',
      timeout: 60000,
    })
  )

  console.log('metaplex', metaplex)

  const { nft } = await metaplex.nfts().create({
    uri: 'https://arweave.net/123',
    name: 'My NFT',
    sellerFeeBasisPoints: 500, // Represents 5.00%.
  })

  console.log('nft', nft)
}

const registerWallet = async () => {
  try {
    // Connect the wallet and get the public key
    const provider = getProvider()
    await provider.request({ method: 'connect' })
    // const publicKey = await window.solana.connect()

    const challenge = await http.get('getChallenge')
    const challengeData = new TextEncoder().encode(challenge.data)

    const signedMessage = await provider.signMessage(challengeData, 'utf8')

    // console.log(window.solana.publicKey.toString())
    const base58 = await import('bs58')
    const walletAddress = provider.publicKey.toString()
    console.log('wallet address: ', walletAddress)

    // Sign the challenge
    const signature = base58.encode(signedMessage.signature)
    console.log('Base58-encoded signature:', signature)

    console.log('challenge', challenge.data)
    console.log('challengeData', challengeData)

    // Make an HTTP request with the signature
    const response = await http.post('verify', {
      publicKey: walletAddress,
      challenge: challenge.data,
      signature: signature,
    })

    console.log(response.data)

    return response.data
  } catch (error) {
    console.error('Error:', error)
    alert('Error occurred. See console for details.')
    return false
  }
}

export default registerWallet
