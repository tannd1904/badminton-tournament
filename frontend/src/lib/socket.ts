import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function useLiveMatch(matchId: string, onUpdate?: (payload: any) => void) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
      socket.emit("joinMatch", { matchId });
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("joinMatch", { matchId });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const handleScoreUpdate = (payload: any) => {
      if (onUpdate) {
        onUpdate(payload);
      }
    };

    socket.on("match.score.updated", handleScoreUpdate);
    socket.on("match.completed", handleScoreUpdate);

    return () => {
      socket.emit("leaveMatch", { matchId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("match.score.updated", handleScoreUpdate);
      socket.off("match.completed", handleScoreUpdate);
    };
  }, [matchId, onUpdate]);

  return { isConnected };
}

export function useLiveTournament(tournamentId: string, onUpdate?: (payload: any) => void) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;

    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
      socket.emit("joinTournament", { tournamentId });
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("joinTournament", { tournamentId });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const handleTournamentUpdate = (payload: any) => {
      if (onUpdate) {
        onUpdate(payload);
      }
    };

    socket.on("tournament.match.updated", handleTournamentUpdate);
    socket.on("tournament.match.completed", handleTournamentUpdate);
    socket.on("schedule.updated", handleTournamentUpdate);

    return () => {
      socket.emit("leaveTournament", { tournamentId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("tournament.match.updated", handleTournamentUpdate);
      socket.off("tournament.match.completed", handleTournamentUpdate);
      socket.off("schedule.updated", handleTournamentUpdate);
    };
  }, [tournamentId, onUpdate]);

  return { isConnected };
}

