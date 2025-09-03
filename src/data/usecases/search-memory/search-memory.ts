import { VectorRepository } from "../../protocols/index.js";
import { SearchMemoryUseCase } from "../../../domain/usecases/index.js";
import { SearchQuery, SearchResponse } from "../../../domain/entities/index.js";

export class SearchMemory implements SearchMemoryUseCase {
  constructor(
    private readonly vectorRepository: VectorRepository
  ) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    // Set default weights if not provided
    const searchQuery = {
      ...query,
      semanticWeight: query.semanticWeight ?? 0.4,
      recencyWeight: query.recencyWeight ?? 0.2,
      frequencyWeight: query.frequencyWeight ?? 0.2,
      salienceWeight: query.salienceWeight ?? 0.2,
      timeDecayDays: query.timeDecayDays ?? 30,
      limit: query.limit ?? 20,
    };

    const results = await this.vectorRepository.search(searchQuery);
    
    const queryTime = Date.now() - startTime;
    
    return {
      results,
      totalFound: results.length,
      queryTime,
    };
  }
}