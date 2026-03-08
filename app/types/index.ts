export interface UMUConfig {
  name: string
  description?: string
  iconPath: string
  winePath: string
  executable: string
  gameId: string
  store: string
  protonPath: string
  arguments: string[] | string
}

export interface CarouselItem {
  id: number
  title: string
  description?: string
  image: string
  rawData?: UMUConfig
}
