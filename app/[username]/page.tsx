"use client"
import { use } from "react"
import Image from "next/image"
import { useCollection } from "@/app/lib/useCollection"

export default function UserPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = use(params)
  const { releases, loading, error } = useCollection(username)

  return (
    <div className="">
      <h1>Discogs Collection</h1>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {<p> {releases?.length} albums</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5">
        {releases.slice(0, 10).map((release) => (
          <div key={release.id} className="border p-4 rounded-lg">
            <Image
              src={release.cover_image}
              alt={`${release.title} cover`}
              width={600}
              height={600}
              className="mb-2 w-100"
            />
            <h2 className="text-lg font-semibold">{release.title}</h2>
            <p className="text-sm text-gray-600">{release.artist}</p>
            <p className="text-xs text-gray-500">{release.year}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
