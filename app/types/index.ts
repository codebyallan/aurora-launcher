export interface UMUConfig {
  name: string
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
  image: string
  rawData?: UMUConfig
}
