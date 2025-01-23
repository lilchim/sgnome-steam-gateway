import { ITopicMapping } from "./ITopicMapping.js";

export interface ISteamAPITopicMappings {
    resolveVanityURL: ITopicMapping;
    getOwnedGames: ITopicMapping;
    getPlayerSummaries: ITopicMapping;
}