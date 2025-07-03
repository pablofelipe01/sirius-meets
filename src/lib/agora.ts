// Agora configuration
export const agoraConfig = {
  appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
  certificate: process.env.NEXT_PUBLIC_AGORA_APP_CERTIFICATE || ''
}

// Validate Agora configuration
export const isAgoraConfigured = () => {
  return agoraConfig.appId !== ''
}