import Async from "react-async"

// You can use async/await or any function that returns a Promise
const loadPlayer = async () => {
    const res = await fetch(`https://dog-facts-api.herokuapp.com/api/v1/resources/dogs?number=1`)
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
}

const MyComponent = () => (
    <Async promiseFn={loadPlayer} playerId={1}>
        {({ data, error, isPending }) => {
            if (isPending) return "Loading..."
            if (error) return `Something went wrong: ${error.message}`
            if (data)
                return (
                    <div>
                        <strong>Player data:</strong>
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </div>
                )
            return null
        }}
    </Async>
)
export default MyComponent;