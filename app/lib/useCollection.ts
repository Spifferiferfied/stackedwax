import { useEffect, useState } from "react"

interface Release {
  id: number
  title: string
  artist: string
  year: number
  cover_image: string
}

interface UseCollectionResult {
  releases: Release[]
  loading: boolean
  error: string | null
  totalPages: number
}

export function useCollection(
  username: string,
  perPage: number = 100,
  sort: string = "artist"
): UseCollectionResult {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)

  useEffect(() => {
    if (!username) {
      setError("Username is required")
      setLoading(false)
      return
    }

    const fetchPage = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(
          `/api/collection/${username}?page=${page}&per_page=${perPage}&sort=${sort}`
        )

        if (!res.ok) {
          throw new Error(`Error: ${res.status}`)
        }

        const data = await res.json()

        // biome-ignore lint/suspicious/noExplicitAny: Discogs API response
        const items = data.releases.map((item: any) => ({
          id: item.id,
          title: item.basic_information.title,
          artist: item.basic_information.artists
            // biome-ignore lint/suspicious/noExplicitAny: Discogs API response
            ?.map((a: any) => a.name)
            .join(", "),
          year: item.basic_information.year,
          cover_image: item.basic_information.cover_image,
        }))

        setReleases((prev) => [...prev, ...items])
        setTotalPages(data.pagination.pages)

        if (page < data.pagination.pages) {
          setPage((p) => p + 1)
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("An unknown error occurred.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPage()
  }, [username, perPage, sort, page])

  return { releases, loading, error, totalPages }
}
