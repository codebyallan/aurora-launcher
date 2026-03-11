export interface UMUConfig {
  name: string
  description?: string
  heroPath: string
  iconPath: string
  winePath: string
  executable: string
  gameId: string
  store: string
  protonPath: string
  arguments: string[] | string
  extraEnv?: Record<string, string>
}
export interface CarouselItem {
  id: number
  title: string
  description?: string
  image: string
  icon: string
  rawData?: UMUConfig
}
