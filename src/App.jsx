import { useEffect, useState, useRef } from "react";

function App() {
  const contestTypes = [
    "Div. 1",
    "Div. 2",
    "Div. 3",
    "Div. 4",
    "Div. 1 +  Div. 2",
  ];

  const [selectedType, setSelectedType] = useState("Div. 2");
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [contestProblems, setContestProblems] = useState({});
  const [username, setUsername] = useState("");
  const [solvedProblems, setSolvedProblems] = useState(new Set());
  const [fetchingUser, setFetchingUser] = useState(false);
  const [error, setError] = useState(null);

  const lastRequestTime = useRef(0);
  const requestDelay = 1500;

  const rateLimitedFetch = async (url) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;

    if (timeSinceLastRequest < requestDelay) {
      const waitTime = requestDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTime.current = Date.now();
    return fetch(url);
  };

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const res = await fetch(
          "https://codeforces.com/api/contest.list?gym=false"
        );
        const data = await res.json();

        if (data.status === "OK") {
          const latest200Contests = data.result
            .filter((c) => c.phase === "FINISHED")
            .slice(0, 200);

          setContests(latest200Contests);
        }
      } 
      catch (error) {
        console.log(error);
      } 
      finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  const filteredContests = contests.filter((contest) => {
    if (selectedType === "Div. 1 +  Div. 2") {
      return /\(Div\.\s1\s\+\sDiv\.\s2\)/.test(contest.name);
    }

    const divNumber = selectedType.split(". ")[1];
    const pattern = new RegExp(`\\(Div\\.\\s*${divNumber}\\)`);

    return pattern.test(contest.name);
  });

  const toggleQuestions = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (!contestProblems[id]) {
      const res = await fetch(
        `https://codeforces.com/api/contest.standings?contestId=${id}&from=1&count=1`
      );
      const data = await res.json();

      setContestProblems((prev) => ({
        ...prev,
        [id]: data.result.problems,
      }));
    }
  };

  const fetchUserSubmissions = async () => {
    if (!username) return;

    try {
      setFetchingUser(true);

      const res = await fetch(
        `https://codeforces.com/api/user.status?handle=${username}`
      );
      const data = await res.json();

      if (data.status === "OK") {
        const solvedSet = new Set();

        data.result.forEach((submission) => {
          if (submission.verdict === "OK") {
            const key = `${submission.problem.contestId}-${submission.problem.index}`;
            solvedSet.add(key);
          }
        });

        setSolvedProblems(solvedSet);
        setError(null);
      }
      else{
        setSolvedProblems(new Set());
        setError("User not found");
      }
    } 
    catch (error) {
      console.log("Error fetching user submissions: ", error);
    } 
    finally {
      setFetchingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 sm:px-10 lg:px-20 py-10">
      <div className="max-w-7xl mx-auto">

        <div className="text-3xl font-semibold mb-12 text-center">
          Contest Deck
        </div>

        <div className="bg-white shadow-sm border rounded-xl p-6 mb-12 flex justify-center">
          <div className="flex items-center gap-4">
            <label className="text-lg font-medium">
              Enter your username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="border border-gray-300 rounded-lg px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-black transition"
            />

            {error && (
              <div className="text-red-500 text-center mt-4 font-medium">
                {error}
              </div>
            )}

            <button
              onClick={fetchUserSubmissions}
              disabled={fetchingUser}
              className={`px-6 py-2 rounded-lg text-white transition 
                ${fetchingUser 
                  ? "bg-gray-500 cursor-not-allowed" 
                  : "bg-black hover:bg-gray-800 cursor-pointer"}`}
            >
              {fetchingUser ? "Loading..." : "Get Data"}
            </button>
          </div>
        </div>

        <div className="mb-10 flex flex-wrap gap-3 justify-center">
          {contestTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedType === type
                  ? "bg-black text-white"
                  : "bg-white border hover:bg-gray-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-gray-500">
            Loading contests...
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
          {filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition"
            >
              <h2 className="font-semibold text-lg mb-2">
                {contest.name}
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                {new Date(contest.startTimeSeconds * 1000).toLocaleDateString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://codeforces.com/contest/${contest.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white px-3 py-2 rounded text-sm"
                >
                  View Contest
                </a>

                <button
                  onClick={() => toggleQuestions(contest.id)}
                  className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm transition cursor-pointer"
                >
                  {expandedId === contest.id
                    ? "Hide Questions"
                    : "View Questions"}
                </button>
              </div>

              {expandedId === contest.id &&
                contestProblems[contest.id] && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {contestProblems[contest.id].map((problem) => (
                      <a
                        key={`${contest.id}-${problem.index}`}
                        href={`https://codeforces.com/contest/${contest.id}/problem/${problem.index}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block px-3 py-2 rounded-lg text-sm transition ${
                          solvedProblems.has(
                            `${contest.id}-${problem.index}`
                          )
                            ? "bg-green-200"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {problem.index}. {problem.name}
                      </a>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;